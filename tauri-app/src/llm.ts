/**
 * LLM-Beratung: Verträge für Anbieter, Maskierung, Modelle und Beratungen.
 *
 * **Sicherheit (Fail Closed):** API-Keys werden **nie im Klartext**
 * gespeichert. Im Tauri-Store liegt nur die Maske (`sk-ant-…1234`) plus ein
 * Hinweis, ob ein Key vorhanden ist; der echte Key lebt ausschließlich im
 * laufenden Prozess (Zustand der Oberfläche) und wird je Beratungsauftrag
 * an die Backend-Brücke übergeben — die ihn nur an den Provider schickt
 * und sonst nirgends ablegt. Ohne echten Key läuft keine Beratung.
 */

/** Bekannte Anbieter mit Basis-URL (OpenAI-kompatible chat/completions). */
export type AnbieterId = "nvidia" | "openrouter" | "anthropic";

export type Anbieter = {
  id: AnbieterId;
  name: string;
  /** Basis-URL der Chat-Completions (NIM bzw. OpenRouter, Anthropic-Messages). */
  basisUrl: string;
  /** API-Key-Header-Familie: Bearer (OpenAI-Stil) oder x-api-key. */
  kopfart: "bearer" | "x-api-key";
  /** Pflichtfeld-Anteil der Maske im Fehlerfall (Hinweistext). */
  hinweis: string;
};

/** Der eine Anbieter-Katalog (eine Wahrheit, vom Frontend benutzt). */
export const ANBIETER: Record<AnbieterId, Anbieter> = {
  nvidia: {
    id: "nvidia",
    name: "NVIDIA NIM",
    basisUrl: "https://integrate.api.nvidia.com/v1",
    kopfart: "bearer",
    hinweis: "Key von build.nvidia.com (nvapi-…).",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    basisUrl: "https://openrouter.ai/api/v1",
    kopfart: "bearer",
    hinweis: "Key von openrouter.ai/keys (sk-or-…).",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    basisUrl: "https://api.anthropic.com/v1",
    kopfart: "x-api-key",
    hinweis: "Key von console.anthropic.com (sk-ant-…).",
  },
};

/** Reihenfolge im Dropdown. */
export const ANBIETER_LISTE: AnbieterId[] = ["nvidia", "openrouter", "anthropic"];

/**
 * Erkennt anhand einer Basis-URL den Anbieter (Anforderung: „die URL
 * erkennen“). Unbekannte URLs ergeben `null` — dann bleibt die Auswahl
 * manuell (Fail Loud statt stiller Zuordnung).
 */
export function anbieterAusUrl(url: string): AnbieterId | null {
  const normalisiert = url.trim().toLowerCase().replace(/\/+$/, "");
  for (const id of ANBIETER_LISTE) {
    const basis = ANBIETER[id].basisUrl.toLowerCase().replace(/\/+$/, "");
    if (normalisiert === basis || normalisiert.startsWith(`${basis}/`)) {
      return id;
    }
  }
  return null;
}

/**
 * Maskiert einen Key für die Ablage: erst 4 Zeichen, „…“, letzte 4 —
 * dazwischen nur Punkte. Kürzer als 12 Zeichen gilt als kein gültiger Key.
 * **Die Maske ist unumkehrbar**; der Klartext kehrt nie aus dem Speicher
 * zurück, die Oberfläche fragt den Key neu ab, wenn eine Beratung läuft.
 */
export function keyMaskieren(key: string): string | null {
  const geschnitten = key.trim();
  if (geschnitten.length < 12) return null;
  return `${geschnitten.slice(0, 4)}…${geschnitten.slice(-4)}`;
}

/** Sieht eine Maske so aus wie von `keyMaskieren` (Anzeige-Logik). */
export function istMaske(wert: string): boolean {
  return /^[^\s…]{2,10}…[^\s…]{2,10}$/.test(wert.trim());
}

/** Beratungs-Auslöser: sofort, nach jedem Tick oder periodisch. */
export type Ausloeser = "sofort" | "je-tick" | "periodisch";

/** Ein Beratungsauftrag an die Backend-Brücke (Feldnamen snake_case). */
export type Beratungsauftrag = {
  anbieter: AnbieterId;
  basis_url: string;
  model: string;
  api_key: string;
  system_prompt: string;
  nutzer_prompt: string;
  /** Kontexttext (Scan-/Live-Zusammenfassung); leer = nur Prompts. */
  kontext: string;
  max_tokens: number;
};

/** Antwort der Brücke (Rust: `BeratungAntwort`). */
export type BeratungsAntwort = {
  ok: boolean;
  text: string;
  modell: string;
  fehler: string | null;
};

/** Kurze Modell-Liste je Anbieter (freie Texteingabe bleibt erlaubt). */
export const MODELL_VORSCHLAEGE: Record<AnbieterId, string[]> = {
  nvidia: [
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.3-70b-instruct",
    "mistralai/mixtral-8x22b-instruct-v0.1",
    "nvidia/llama-3.1-nemotron-70b-instruct",
  ],
  openrouter: [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.1-70b-instruct",
    "google/gemini-flash-1.5",
  ],
  anthropic: [
    "claude-sonnet-4-5",
    "claude-3-5-haiku-latest",
  ],
};

/** Standard-Prompt der Beratung (überschreibbar im Feld). */
export const STANDARD_PROMPT =
  "Analysiere den Projektzustand und nenne die drei wichtigsten " +
  "Beobachtungen mit kurzer Handlungsempfehlung. Antworte knapp auf Deutsch.";

/** Auslöser-Beschriftungen (Anzeige). */
export const AUSLOESER_TITEL: Record<Ausloeser, string> = {
  sofort: "Nur manuell (Knopf)",
  "je-tick": "Nach jedem Live-Tick",
  periodisch: "Periodisch (Intervall)",
};
