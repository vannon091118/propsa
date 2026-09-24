import { useCallback, useEffect, useRef, useState } from "react";
import { load } from "@tauri-apps/plugin-store";
import { beratungAusfuehren } from "./api";
import { AUSLOESER_TITEL, type Ausloeser } from "./llm";
import { istVorschauMock } from "./devMock";

const SPEICHER = "propakt-einstellungen.json";
const SCHLUESSEL = "llm_konfig";

/** Gespeicherte LLM-Konfiguration (siehe LlmBeratung.tsx). */
type Konfig = {
  anbieter: string;
  basisUrl: string;
  model: string;
  keyMaske: string;
  systemPrompt: string;
  nutzerPrompt: string;
  ausloeser: Ausloeser;
  intervallMinuten: number;
  maxTokens: number;
};

type Props = {
  /** Läuft der Live-Zyklus (Auslöser „je-tick“ nur dann aktiv). */
  laeuft: boolean;
  /** Zähler der Ticks (triggert „je-tick“-Beratung bei Änderung). */
  tickZaehler: number;
  /** Kurzkontext des letzten Ticks für den Beratungstext. */
  tickKontext: () => string;
};

/**
 * Kompakte Beratungssektion des Live-Widgets: lädt die gespeicherte
 * Konfiguration und führt Beratungen je Auslöser aus. Gilt wie in den
 * Einstellungen: **ohne frischen Key im Prozess keine Beratung** — die
 * gespeicherte Maske ist unumkehrbar und kein Ersatz (Fail Closed).
 */
export function LiveBeratung({ laeuft, tickZaehler, tickKontext }: Props) {
  const [konfig, setKonfig] = useState<Konfig | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const letzterTickRef = useRef(0);

  useEffect(() => {
    if (istVorschauMock()) return;
    load(SPEICHER, { autoSave: false }).then((store) =>
      store.get<Konfig>(SCHLUESSEL).then((werte) => werte && setKonfig(werte)),
    );
  }, []);

  const beraten = useCallback(async () => {
    if (!konfig || laedt) return;
    setLaedt(true);
    setFehler(null);
    try {
      // Leerer Key im Auftrag: die Brücke lehnt laut Vertrag ab (Fail
      // Closed), die Meldung fordert dann zur Neueingabe auf.
      const antwort = await beratungAusfuehren({
        anbieter: konfig.anbieter as never,
        basis_url: konfig.basisUrl,
        model: konfig.model,
        api_key: "",
        system_prompt: konfig.systemPrompt,
        nutzer_prompt: nutzerPromptVon(konfig),
        kontext: tickKontext(),
        max_tokens: konfig.maxTokens,
      });
      if (antwort.ok) {
        setText(antwort.text);
      } else {
        setFehler(antwort.fehler ?? "Provider-Fehler.");
      }
    } catch (grund) {
      setFehler(String(grund).slice(0, 140));
    } finally {
      setLaedt(false);
    }
  }, [konfig, laedt, tickKontext]);

  // Auslöser „je-tick“: nur bei neuem Tick und laufendem Zyklus.
  useEffect(() => {
    if ((konfig?.ausloeser ?? null) !== "je-tick") return;
    if (!laeuft || tickZaehler === letzterTickRef.current) return;
    letzterTickRef.current = tickZaehler;
    void beraten();
  }, [tickZaehler, laeuft, konfig, beraten]);

  // Auslöser „periodisch“: Intervall in Minuten, Minimum 1.
  useEffect(() => {
    if ((konfig?.ausloeser ?? null) !== "periodisch") return;
    const ms = Math.max(konfig?.intervallMinuten ?? 30, 1) * 60_000;
    const timer = window.setInterval(() => void beraten(), ms);
    return () => window.clearInterval(timer);
  }, [konfig, beraten]);

  if (!konfig) return null;

  return (
    <div className="rounded-knopf border border-white/10 bg-white/5 px-2 py-1.5 text-[11px]">
      <div className="flex items-center gap-1.5">
        <strong className="text-tinte">Beratung</strong>
        <span className="ml-auto text-leise/70">{konfig.model}</span>
        {laedt && <span className="animate-pulsieren text-leise">…</span>}
      </div>
      {text && <p className="mt-1 whitespace-pre-wrap text-tinte/85">{kurz(text, 220)}</p>}
      {fehler && <p className="mt-1 text-fehler">{kurz(fehler, 160)}</p>}
      {!text && !fehler && (
        <p className="mt-1 text-leise/70">
          Auslöser: {AUSLOESER_TITEL[konfig.ausloeser]} · Key im Prozess nötig
        </p>
      )}
    </div>
  );
}

/** Nutzer-Prompt der Widget-Beratung (Fallback wie im Einstellungs-Panel). */
function nutzerPromptVon(konfig: Konfig): string {
  return konfig.nutzerPrompt || "Nenne die wichtigste Beobachtung und eine Empfehlung.";
}

/** Kürzt Text auf die angegebene Zeichenzahl (Anzeige im Mini-Widget). */
function kurz(text: string, maximum: number): string {
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`;
}
