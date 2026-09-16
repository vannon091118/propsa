import type { ScanZustand } from "./typen";
import { dauerText, useLaufzeit } from "./useZaehler";

type Props = {
  zustand: ScanZustand;
  /** Zählt die Laufzeit mit (Scan oder Export). */
  laeuft: boolean;
  /** Kurzinfo im Ruhezustand (z. B. „14 Dateien“). */
  meldung?: string;
};

const BESCHRIFTUNG: Record<ScanZustand, string> = {
  bereit: "Bereit",
  scanne: "Scanne…",
  export: "Exportiere…",
  fertig: "Fertig",
  fehler: "Fehler",
};

/** Rahmenfarbe und Leuchten der Pille je Zustand. */
const RAHMEN: Record<ScanZustand, string> = {
  bereit: "border-white/12",
  scanne: "border-neon-cyan shadow-neon-cyan",
  export: "border-neon-cyan shadow-neon-cyan",
  fertig: "border-ok",
  fehler: "border-fehler text-fehler",
};

/** Farbe und Animation des Punkts je Zustand. */
const PUNKT: Record<ScanZustand, string> = {
  bereit: "bg-leise",
  scanne: "animate-pulsieren bg-neon-cyan",
  export: "animate-pulsieren bg-neon-cyan",
  fertig: "bg-ok",
  fehler: "bg-fehler",
};

/** Kopfzeilen-Indikator: Zustand, Laufzeit und Kurzinfo. */
export function StatusLeiste({ zustand, laeuft, meldung }: Props) {
  const sekunden = useLaufzeit(laeuft);

  return (
    <div
      className={`animate-einfahren ml-auto flex items-center gap-2.5 rounded-full border bg-white/6 px-3 py-1.5 text-[12px] text-leise backdrop-blur-md transition ${RAHMEN[zustand]}`}
    >
      <span className={`size-2.5 flex-none rounded-full ${PUNKT[zustand]}`} />
      <span>{BESCHRIFTUNG[zustand]}</span>
      {laeuft && <span className="text-[11px] text-leise">{dauerText(sekunden)}</span>}
      {!laeuft && meldung && <span className="text-[11px] text-leise">{meldung}</span>}
    </div>
  );
}
