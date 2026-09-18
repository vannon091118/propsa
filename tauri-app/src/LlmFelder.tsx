/** Geteilte Klassen und kleine Felder der LLM-Beratungs-UI (LOC-Splitter). */

export const BESCHRIFTUNG = "text-[12px] font-medium text-leise";
export const HINWEIS = "text-[11px] text-leise";
export const EINGABE =
  "rounded-feld border border-white/12 bg-white/5 text-[13px] text-tinte transition-colors focus:border-neon-cyan";
export const KLEIN = `px-2.5 py-[7px] ${EINGABE}`;

type TextfeldProps = {
  beschriftung: string;
  wert: string;
  onAendern: (wert: string) => void;
  zeilen?: number;
  platzhalter?: string;
};

/** Mehrzeiliges Feld mit Beschriftung (Prompts der Beratung). */
export function Textfeld({ beschriftung, wert, onAendern, zeilen = 2, platzhalter }: TextfeldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={BESCHRIFTUNG}>{beschriftung}</label>
      <textarea
        value={wert}
        onChange={(e) => onAendern(e.target.value)}
        rows={zeilen}
        placeholder={platzhalter}
        className={`px-2.5 py-2 ${EINGABE}`}
      />
    </div>
  );
}
