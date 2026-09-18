import {
  ANBIETER,
  ANBIETER_LISTE,
  MODELL_VORSCHLAEGE,
  anbieterAusUrl,
  type AnbieterId,
} from "./llm";
import { BESCHRIFTUNG, HINWEIS, EINGABE } from "./LlmFelder";

type Props = {
  anbieter: AnbieterId;
  basisUrl: string;
  model: string;
  keyEingabe: string;
  keyMaske: string;
  keyFrisch: boolean;
  onAnbieter: (id: AnbieterId) => void;
  onUrl: (url: string) => void;
  onModell: (modell: string) => void;
  onKey: (key: string) => void;
};

/**
 * Verbindungs-Formular der LLM-Beratung: Anbieter-Dropdown (NVIDIA NIM,
 * OpenRouter, Anthropic), Basis-URL mit automatischer Anbieter-Erkennung,
 * Modellwahl (Vorschläge + freie Eingabe) und der Key-Bereich, der den
 * Schlüssel **nur maskiert** speichert.
 */
export function LlmVerbindung({
  anbieter,
  basisUrl,
  model,
  keyEingabe,
  keyMaske,
  keyFrisch,
  onAnbieter,
  onUrl,
  onModell,
  onKey,
}: Props) {
  return (
    <>
      {/* Anbieter: Dropdown mit URL + automatischer Erkennung. */}
      <div className="flex flex-col gap-1.5">
        <label className={BESCHRIFTUNG}>Anbieter</label>
        <select
          value={anbieter}
          onChange={(e) => onAnbieter(e.target.value as AnbieterId)}
          className={EINGABE}
        >
          {ANBIETER_LISTE.map((id) => (
            <option key={id} value={id}>
              {ANBIETER[id].name} — {ANBIETER[id].basisUrl}
            </option>
          ))}
        </select>
        <div className={HINWEIS}>{ANBIETER[anbieter].hinweis}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={BESCHRIFTUNG}>Basis-URL (erkennt den Anbieter)</label>
        <input
          type="url"
          value={basisUrl}
          onChange={(e) => onUrl(e.target.value)}
          className={`font-mono ${EINGABE}`}
        />
      </div>

      {/* Modell: Vorschlagsliste + freie Eingabe. */}
      <div className="flex flex-col gap-1.5">
        <label className={BESCHRIFTUNG}>Modell</label>
        <select value={model} onChange={(e) => onModell(e.target.value)} className={EINGABE}>
          {[...new Set([model, ...MODELL_VORSCHLAEGE[anbieter]])].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={model}
          onChange={(e) => onModell(e.target.value)}
          placeholder="oder Modell-ID eintippen…"
          className={`font-mono ${EINGABE}`}
        />
      </div>

      {/* API-Key: nur maskiert speichern (Klartext wird nie abgelegt). */}
      <div className="flex flex-col gap-1.5">
        <label className={BESCHRIFTUNG}>API-Key (nur maskiert gespeichert)</label>
        <input
          type="password"
          value={keyEingabe}
          onChange={(e) => onKey(e.target.value)}
          placeholder={
            keyMaske
              ? `Gespeicherte Maske: ${keyMaske} — neuen Key eingeben`
              : ANBIETER[anbieter].hinweis
          }
          className={`px-2.5 py-2 ${EINGABE}`}
        />
        <div className={HINWEIS}>
          {keyMaske
            ? `Maskiert gespeichert: ${keyMaske}. ${keyFrisch ? "Neuer Key bereit." : "Für eine Beratung den Key erneut eingeben (nie im Klartext abgelegt)."}`
            : "Kein Key gespeichert. Der echte Schlüssel bleibt nur im laufenden Prozess."}
        </div>
      </div>
    </>
  );
}
