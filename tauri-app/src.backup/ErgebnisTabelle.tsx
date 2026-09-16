import { memo, useState, type CSSProperties } from "react";
import { SprachChip } from "./SprachChip";
import type { ScanErgebnis } from "./typen";
import { zahl } from "./zahl";

type Props = {
  ergebnis: ScanErgebnis;
};

/** Ab dieser Zeilenzahl gilt eine Datei als Hotspot (wie im CLI-Dashboard). */
const HOTSPOT_ZEILEN = 300;

/** Ab so vielen Zeilen wird die Einblendung nicht weiter verzögert. */
const MAX_STAFFEL = 20;

/**
 * So viele Zeilen stehen sofort im DOM.
 *
 * Jede Zeile kostet beim Layout rund eine Millisekunde (gemessen: 2 000 Zeilen
 * ≈ 1 966 ms, eine einfache Zeile ≈ 190 ms). Ein Scan mit 20 000 Dateien würde
 * die Oberfläche damit über 20 Sekunden blockieren, deshalb wird der Rest auf
 * Klick eingehängt – das Paket selbst enthält weiterhin jede Datei.
 */
const ERSTE_ZEILEN = 200;

const KOPFZELLE =
  "sticky top-0 z-10 border-b border-white/10 bg-kopf/80 px-2.5 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-leise backdrop-blur";
const ZELLE = "border-b border-white/8 px-2.5 py-2 text-left";
const ZAHL = `${ZELLE} w-24 whitespace-nowrap text-right tabular-nums`;

/** Größte Zeilenzahl in einem Durchgang (ein Spread über 100 000 Werte bricht ab). */
function groessteZeilen(ergebnis: ScanErgebnis): number {
  let groesste = 1;
  for (const datei of ergebnis.dateien) {
    if (datei.zeilen > groesste) {
      groesste = datei.zeilen;
    }
  }
  return groesste;
}

/** Dateiliste mit Sprach-, Größen- und Hotspot-Indikatoren. */
function ErgebnisTabelleBasis({ ergebnis }: Props) {
  const [alleZeigen, setAlleZeigen] = useState(false);

  if (ergebnis.dateien.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center text-leise">
        <p>Keine Dateien gefunden.</p>
        <p>Passen die Ausschlussmuster zum Projekt?</p>
      </div>
    );
  }

  const groesste = groessteZeilen(ergebnis);
  const sichtbar = alleZeigen ? ergebnis.dateien : ergebnis.dateien.slice(0, ERSTE_ZEILEN);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[640px] border-collapse overflow-hidden rounded-knopf border border-white/10 bg-white/3 text-[13px] [&_tbody_tr:last-child_td]:border-b-0 [&_td:first-child]:min-w-[240px] [&_th:first-child]:min-w-[240px]">
        <thead>
          <tr>
            <th className={KOPFZELLE}>Datei</th>
            <th className={KOPFZELLE}>Sprache</th>
            <th className={`${KOPFZELLE} text-right`}>Zeilen</th>
            <th className={`${KOPFZELLE} text-right`}>Zeichen</th>
            <th className={`${KOPFZELLE} w-24`}>Anteil</th>
          </tr>
        </thead>
        <tbody>
          {sichtbar.map((datei, index) => (
            <tr
              className="animate-gleiten [animation-delay:calc(var(--i)*10ms)] transition-colors hover:bg-neon-cyan/6"
              key={datei.relativer_pfad}
              style={{ "--i": Math.min(index, MAX_STAFFEL) } as CSSProperties}
            >
              <td className={ZELLE}>
                <span className="font-mono text-[12px] text-neon-cyan">
                  {datei.relativer_pfad}
                </span>
                {datei.zeilen >= HOTSPOT_ZEILEN && (
                  <span
                    className="ml-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-warnung/40 px-2 py-0.5 text-[11px] font-medium text-warnung"
                    title="Große Datei – Kandidat für einen Schnitt"
                  >
                    <span className="size-[7px] flex-none rounded-full bg-warnung" />
                    groß
                  </span>
                )}
              </td>
              <td className={ZELLE}>
                <SprachChip sprache={datei.sprache} />
              </td>
              <td className={ZAHL}>{zahl(datei.zeilen)}</td>
              <td className={ZAHL}>{zahl(datei.zeichen)}</td>
              <td className={`${ZELLE} w-24`}>
                <span
                  className="block h-[5px] min-w-[3px] rounded-full bg-gradient-to-r from-neon-cyan to-neon-violett transition-[width]"
                  style={{ width: `${(datei.zeilen / groesste) * 100}%` }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sichtbar.length < ergebnis.dateien.length && (
        <div className="flex flex-wrap items-center gap-3 px-2.5 py-3 text-[12px] text-leise">
          <span>
            Angezeigt: {zahl(sichtbar.length)} von {zahl(ergebnis.dateien.length)} Dateien –
            das Kontextpaket enthält alle.
          </span>
          <button
            type="button"
            onClick={() => setAlleZeigen(true)}
            className="rounded-knopf border border-neon-cyan/40 px-2.5 py-1 font-medium text-neon-cyan transition-colors hover:bg-neon-cyan/10"
          >
            Alle {zahl(ergebnis.dateien.length)} Zeilen anzeigen
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Bei jedem Fortschritts-Ereignis rendert die Oberfläche neu; die Tabelle
 * bleibt davon unberührt, weil sich ihr Ergebnis nicht ändert.
 */
export const ErgebnisTabelle = memo(ErgebnisTabelleBasis);
