//! HTTPS-Brücke für die LLM-Beratung (Kommando `llm_beratung`).
//!
//! **Sicherheitsvertrag:** Der API-Key kommt je Aufruf aus dem Frontend und
//! wird **ausschließlich** für diesen einen HTTP-Request benutzt — keine
//! Datei, kein Log, kein Store. HTTPS-only: `http://` wird abgelehnt
//! (Fail Closed). OpenAI-kompatible Anbieter (NVIDIA NIM, OpenRouter) wie
//! Anthropic-Messages unterscheiden sich nur in Pfad und Headern.

use serde::{Deserialize, Serialize};

/// Time-out des Beratungsauftrags (Hardware-Schonung, marode Verbindungen).
const TIMEOUT_SEKUNDEN: u64 = 60;

/// Auftrag des Frontends (Feldnamen snake_case, wie `Beratungsauftrag`).
#[derive(Debug, Deserialize)]
pub struct Beratungsauftrag {
    pub basis_url: String,
    pub model: String,
    pub api_key: String,
    pub system_prompt: String,
    pub nutzer_prompt: String,
    #[serde(default)]
    pub kontext: String,
    #[serde(default = "standard_max_tokens")]
    pub max_tokens: u32,
}

fn standard_max_tokens() -> u32 {
    512
}

/// Antwort an das Frontend.
#[derive(Debug, Serialize)]
pub struct BeratungAntwort {
    pub ok: bool,
    pub text: String,
    pub modell: String,
    pub fehler: Option<String>,
}

/// Der eine Anfrage-Körper beider Provider-Familien (OpenAI-Stil).
fn koerper_openai(auftrag: &Beratungsauftrag, kontext_zeilen: &str) -> serde_json::Value {
    serde_json::json!({
        "model": auftrag.model,
        "max_tokens": auftrag.max_tokens,
        "messages": [
            { "role": "system", "content": auftrag.system_prompt },
            { "role": "user", "content": format!("{}\n\n{}", auftrag.nutzer_prompt, kontext_zeilen) }
        ]
    })
}

/// Anfrage-Körper der Anthropic-Messages-API.
fn koerper_anthropic(auftrag: &Beratungsauftrag, kontext_zeilen: &str) -> serde_json::Value {
    serde_json::json!({
        "model": auftrag.model,
        "max_tokens": auftrag.max_tokens,
        "system": auftrag.system_prompt,
        "messages": [
            { "role": "user", "content": format!("{}\n\n{}", auftrag.nutzer_prompt, kontext_zeilen) }
        ]
    })
}

/// Extrahiert den Antworttext aus beiden Provider-Antwortformaten.
fn text_aus_antwort(koerper: &serde_json::Value, anthropic_stil: bool) -> Option<String> {
    if anthropic_stil {
        // Anthropic: {"content":[{"type":"text","text":"…"}]}
        koerper.get("content").and_then(|c| c.as_array()).map(|liste| {
            liste
                .iter()
                .filter_map(|block| block.get("text").and_then(|t| t.as_str()))
                .collect::<Vec<_>>()
                .join("")
        })
    } else {
        // OpenAI-Stil: {"choices":[{"message":{"content":"…"}}]}
        koerper
            .get("choices")
            .and_then(|c| c.as_array())
            .and_then(|liste| liste.first())
            .and_then((|wahl| wahl.get("message").and_then(|m| m.get("content"))) as fn(&serde_json::Value) -> Option<&serde_json::Value>)
            .and_then(|c| c.as_str())
            .map(String::from)
    }
}

/// Führt einen Beratungsauftrag aus: nur https, Key nur im Speicher des
/// Requests, Fehler mit Provider-Text (Fail Loud).
#[tauri::command]
pub fn llm_beratung(auftrag: Beratungsauftrag) -> Result<BeratungAntwort, String> {
    if !auftrag.basis_url.starts_with("https://") {
        return Err("Nur https-Basis-URLs sind erlaubt (Fail Closed).".into());
    }
    if auftrag.api_key.trim().is_empty() {
        return Err("Kein API-Key im laufenden Prozess — Beratung abgelehnt.".into());
    }

    let anthropic_stil = auftrag.basis_url.contains("api.anthropic.com");
    let basis = auftrag.basis_url.trim_end_matches('/');
    let url = if anthropic_stil {
        format!("{basis}/messages")
    } else {
        format!("{basis}/chat/completions")
    };
    let kontext_zeilen = auftrag.kontext.trim().to_string();
    let koerper = if anthropic_stil {
        koerper_anthropic(&auftrag, &kontext_zeilen)
    } else {
        koerper_openai(&auftrag, &kontext_zeilen)
    };

    let agent: ureq::Agent = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(TIMEOUT_SEKUNDEN))
        .build();
    let mut anfrage = agent
        .post(&url)
        .set(
            "Authorization",
            &format!("Bearer {}", auftrag.api_key.trim()),
        )
        .set("Content-Type", "application/json");
    if anthropic_stil {
        anfrage = anfrage
            .set("x-api-key", auftrag.api_key.trim())
            .set("anthropic-version", "2023-06-01");
    }

    let antwort = anfrage
        .send_json(koerper)
        .map_err(|fehler| format!("Provider nicht erreichbar: {fehler}"))?;
    let koerper_text: serde_json::Value = antwort
        .into_json()
        .map_err(|fehler| format!("Antwort nicht lesbar: {fehler}"))?;

    if let Some(text) = text_aus_antwort(&koerper_text, anthropic_stil) {
        return Ok(BeratungAntwort {
            ok: true,
            text,
            modell: auftrag.model.clone(),
            fehler: None,
        });
    }

    // Fail Loud: Provider-Fehler weiterreichen (ohne Key — der steht nie
    // im Antwortkörper), plus kurzer Rohriss für unbekannte Formate.
    let hinweis = koerper_text
        .get("error")
        .map(|e| e.to_string())
        .unwrap_or_else(|| koerper_text.to_string());
    Ok(BeratungAntwort {
        ok: false,
        text: String::new(),
        modell: auftrag.model.clone(),
        fehler: Some(hinweis.chars().take(400).collect()),
    }
    )
}
