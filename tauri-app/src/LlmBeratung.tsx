import { useCallback, useEffect, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import {
  ANBIETER,
  MODELL_VORSCHLAEGE,
  STANDARD_PROMPT,
  AUSLOESER_TITEL,
  anbieterAusUrl,
  keyMaskieren,
  type AnbieterId,
  type Ausloeser,
} from "./llm";
import { istVorschauMock } from "./devMock";
import { BESCHRIFTUNG, EINGABE, KLEIN, Textfeld } from "./LlmFelder";
import { LlmVerbindung } from "./LlmVerbindung";
import { beratungAusfuehren } from "./api";

const KNOPF =
  "rounded-knopf bg-gradient-to-r from-neon-cyan to-neon-violett px-3.5 py-2.5 text-[14px] font-semibold text-[#08111a] shadow-neon-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

type Props = {
  /** Läuft gerade ein Scan (Knöpfe sperren). */
  laedt: boolean;
  /** Liefert den Kontexttext (Scan- oder Live-Zusammenfassung). */
  kontextHolen: () => string;
};

/** Store-Ablage (nur Maske + Konfiguration — nie der Klartext!). */
const SPEICHER = "propakt-einstellungen.json";
const SCHLUESSEL = "llm_konfig";

/** Gespeicherte Konfiguration (Maske statt Key). */
export type LlmKonfig = {
  anbieter: AnbieterId;
  basisUrl: string;
  model: string;
  keyMaske: string;
  systemPrompt: string;
  nutzerPrompt: string;
  ausloeser: Ausloeser;
  intervallMinuten: number;
  maxTokens: number;
};

const STANDARD: LlmKonfig = {
  anbieter: "nvidia",
  basisUrl: ANBIETER.nvidia.basisUrl,
  model: MODELL_VORSCHLAEGE.nvidia[0],
  keyMaske: "",
  systemPrompt: "",
  nutzerPrompt: STANDARD_PROMPT,
  ausloeser: "sofort",
  intervallMinuten: 30,
  maxTokens: 512,
};

/**
 * Einstellungs- und Ausführungsbereich „LLM-Beratung“.
 *
 * **Key-Sicherheit:** Der eingegebene Schlüssel bleibt nur im
 * Laufzeitzustand; gespeichert wird ausschließlich die unumkehrbare Maske
 * (`sk-a…1234`) plus Konfiguration. Ohne frisch eingegebenen Key läuft
 * keine Beratung (Fail Closed) — die Maske ist kein Ersatz.
 */
export function LlmBeratung({ laedt, kontextHolen }: Props) {
  const [anbieter, setAnbieter] = useState<AnbieterId>(STANDARD.anbieter);
  const [basisUrl, setBasisUrl] = useState(STANDARD.basisUrl);
  const [model, setModel] = useState(STANDARD.model);
  const [keyEingabe, setKeyEingabe] = useState("");
  const [keyMaske, setKeyMaske] = useState(STANDARD.keyMaske);
  const [keyFrisch, setKeyFrisch] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(STANDARD.systemPrompt);
  const [nutzerPrompt, setNutzerPrompt] = useState(STANDARD.nutzerPrompt);
  const [ausloeser, setAusloeser] = useState<Ausloeser>(STANDARD.ausloeser);
  const [intervallMinuten, setIntervallMinuten] = useState(STANDARD.intervallMinuten);
  const [maxTokens, setMaxTokens] = useState(STANDARD.maxTokens);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [letzteBeratung, setLetzteBeratung] = useState<string | null>(null);
  const [laeuftBeratung, setLaeuftBeratung] = useState(false);

  // Konfiguration + Maske laden (nie der Klartext).
  useEffect(() => {
    if (istVorschauMock()) return;
    load(SPEICHER, { autoSave: false }).then((store) =>
      store.get<Partial<LlmKonfig>>(SCHLUESSEL).then((werte) => {
        if (!werte) return;
        if (werte.anbieter) setAnbieter(werte.anbieter);
        if (werte.basisUrl) setBasisUrl(werte.basisUrl);
        if (werte.model) setModel(werte.model);
        if (werte.keyMaske) setKeyMaske(werte.keyMaske);
        if (werte.systemPrompt) setSystemPrompt(werte.systemPrompt);
        if (werte.nutzerPrompt) setNutzerPrompt(werte.nutzerPrompt);
        if (werte.ausloeser) setAusloeser(werte.ausloeser);
        if (werte.intervallMinuten) setIntervallMinuten(werte.intervallMinuten);
        if (werte.maxTokens) setMaxTokens(werte.maxTokens);
      }),
    );
  }, []);

  // Konfiguration + Maske speichern (Klartext-Key wird verworfen).
  const speichern = useCallback(async () => {
    const maske = keyEingabe.trim() ? keyMaskieren(keyEingabe) : null;
    if (keyEingabe.trim() && !maske) {
      setFehler("Key zu kurz (Minimum 12 Zeichen) — nichts gespeichert.");
      return;
    }
    const ablage: LlmKonfig = {
      anbieter,
      basisUrl,
      model,
      keyMaske: maske ?? keyMaske,
      systemPrompt,
      nutzerPrompt,
      ausloeser,
      intervallMinuten,
      maxTokens,
    };
    if (!istVorschauMock()) {
      const store = await load(SPEICHER, { autoSave: false });
      await store.set(SCHLUESSEL, ablage);
      await store.save();
    }
    setKeyEingabe("");
    setKeyFrisch(false);
    setFehler(null);
    setMeldung(
      maske
        ? `Gespeichert. Key nur maskiert abgelegt: ${maske}`
        : "Konfiguration gespeichert (Key unverändert maskiert).",
    );
  }, [anbieter, basisUrl, model, keyEingabe, keyMaske, systemPrompt, nutzerPrompt, ausloeser, intervallMinuten, maxTokens]);

  /** Ein Beratungslauf (Knopf „Jetzt beraten“ oder periodischer Timer). */
  const beraten = useCallback(async () => {
    if (!keyEingabe.trim()) {
      setFehler(
        "Kein frischer API-Key im Prozess (nur Maske gespeichert) — Key erneut eingeben.",
      );
      return;
    }
    setFehler(null);
    setLaeuftBeratung(true);
    try {
      const antwort = await beratungAusfuehren({
        anbieter,
        basis_url: basisUrl,
        model,
        api_key: keyEingabe.trim(),
        system_prompt: systemPrompt,
        nutzer_prompt: nutzerPrompt,
        kontext: kontextHolen(),
        max_tokens: maxTokens,
      });
      if (antwort.ok) {
        setLetzteBeratung(antwort.text);
        setMeldung(`Beratung geliefert (${antwort.modell}).`);
      } else {
        setFehler(antwort.fehler ?? "Provider meldete einen Fehler.");
      }
    } catch (grund) {
      setFehler(String(grund));
    } finally {
      setLaeuftBeratung(false);
    }
  }, [anbieter, basisUrl, model, keyEingabe, systemPrompt, nutzerPrompt, kontextHolen, maxTokens]);

  // Periodischer Auslöser (Intervall in Minuten).
  useEffect(() => {
    if (ausloeser !== "periodisch") return;
    const ms = Math.max(intervallMinuten, 1) * 60_000;
    const timer = window.setInterval(() => void beraten(), ms);
    return () => window.clearInterval(timer);
  }, [ausloeser, intervallMinuten, beraten]);

  /** Anbieterwechsel setzt URL und (falls fremd) das Modell zurück. */
  const anbieterAendern = (id: AnbieterId) => {
    setAnbieter(id);
    setBasisUrl(ANBIETER[id].basisUrl);
    if (!MODELL_VORSCHLAEGE[id].includes(model)) {
      setModel(MODELL_VORSCHLAEGE[id][0]);
    }
  };

  /** URL-Eingabe erkennt den Anbieter automatisch (Anforderung). */
  const urlAendern = (neu: string) => {
    setBasisUrl(neu);
    const erkannt = anbieterAusUrl(neu);
    if (erkannt && erkannt !== anbieter) anbieterAendern(erkannt);
  };

  return (
    <section className="glas flex flex-col gap-3.5 rounded-panel p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-leise">
        LLM-Beratung
      </h2>

      <LlmVerbindung
        anbieter={anbieter}
        basisUrl={basisUrl}
        model={model}
        keyEingabe={keyEingabe}
        keyMaske={keyMaske}
        keyFrisch={keyFrisch}
        onAnbieter={anbieterAendern}
        onUrl={urlAendern}
        onModell={setModel}
        onKey={(key) => {
          setKeyEingabe(key);
          setKeyFrisch(true);
        }}
      />

      <Textfeld
        beschriftung="System-Prompt (optional)"
        wert={systemPrompt}
        onAendern={setSystemPrompt}
        zeilen={2}
        platzhalter="Rolle/Regeln des Modells, z. B. „Du bist ein code-reviewender Architekt…“"
      />
      <Textfeld
        beschriftung="Beratungsauftrag (Nutzer-Prompt)"
        wert={nutzerPrompt}
        onAendern={setNutzerPrompt}
        zeilen={3}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={BESCHRIFTUNG}>Auslöser</label>
          <select
            value={ausloeser}
            onChange={(e) => setAusloeser(e.target.value as Ausloeser)}
            className={EINGABE}
          >
            {(Object.keys(AUSLOESER_TITEL) as Ausloeser[]).map((id) => (
              <option key={id} value={id}>
                {AUSLOESER_TITEL[id]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={BESCHRIFTUNG}>Intervall (Minuten)</label>
          <input
            type="number"
            min={1}
            max={1440}
            value={intervallMinuten}
            onChange={(e) => setIntervallMinuten(Number(e.target.value) || 30)}
            disabled={ausloeser !== "periodisch"}
            className={KLEIN}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={BESCHRIFTUNG}>Maximale Antwort-Tokens</label>
        <input
          type="number"
          min={64}
          max={4096}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value) || 512)}
          className={KLEIN}
        />
      </div>

      {meldung && <div className="text-[12px] text-ok">{meldung}</div>}
      {fehler && <div className="text-[12px] text-fehler">{fehler}</div>}

      <div className="flex gap-2">
        <button onClick={speichern} disabled={laedt} className={`flex-1 ${KNOPF}`}>
          Speichern
        </button>
        <button
          onClick={() => void beraten()}
          disabled={laedt || laeuftBeratung}
          className={`flex-1 ${KNOPF}`}
        >
          {laeuftBeratung ? "Berate…" : "Jetzt beraten"}
        </button>
      </div>

      {letzteBeratung && (
        <div className="rounded-knopf border border-white/10 bg-white/5 px-2.5 py-2 text-[12px] text-tinte/90">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-leise">
            Letzte Beratung
          </div>
          <div className="max-h-40 overflow-auto whitespace-pre-wrap">{letzteBeratung}</div>
        </div>
      )}
    </section>
  );
}
