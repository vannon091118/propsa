import React from "react";
import type { LiveZeitreihePunkt, Zeitraum } from "./typen";

export interface HistoryPoint {
  zeitstempel: string;
  metriken: {
    anzahl_dateien: number;
    gesamt_zeilen: number;
  };
}

const ZEITRAEUME: Array<{ wert: Zeitraum; label: string; stunden: number | null }> = [
  { wert: "alle", label: "Alles", stunden: null },
  { wert: "7t", label: "7 Tage", stunden: 168 },
  { wert: "24h", label: "24 Std", stunden: 24 },
  { wert: "6h", label: "6 Std", stunden: 6 },
];

/** Stunden eines Zeitraums (`null` = gesamter Verlauf). */
export function stundenFuer(zeitraum: Zeitraum): number | null {
  return ZEITRAEUME.find((eintrag) => eintrag.wert === zeitraum)?.stunden ?? null;
}

interface Props {
  /** Scan-Verlauf aus der JSONL-History (`get_history_metrics`). */
  daten: HistoryPoint[];
  /** Live-Zeitreihe aus SQLite (`get_live_zeitreihe`, Phase 4). */
  liveDaten?: LiveZeitreihePunkt[];
  metric: "dateien" | "zeilen";
  zeitraum: Zeitraum;
  onZeitraum: (zeitraum: Zeitraum) => void;
  /** Nur zeichnen, ohne Zeitraum-Wahl und Legende (z. B. Widget). */
  kompakt?: boolean;
  breite?: number;
  hoehe?: number;
}

type Punkt = { x: number; y: number };

/** Beide Serien führen `%Y-%m-%d %H:%M:%S` — als Date lesbar. */
function alsZeit(text: string): Date {
  return new Date(text.replace(" ", "T"));
}

/** Achsen-Beschriftung je nach Zeitraum-Weite. */
function achsenText(zeit: Date, stunden: number | null): string {
  const zwei = (wert: number) => String(wert).padStart(2, "0");
  if (stunden !== null && stunden <= 24) {
    return `${zwei(zeit.getHours())}:${zwei(zeit.getMinutes())}`;
  }
  return `${zwei(zeit.getDate())}.${zwei(zeit.getMonth() + 1)}.`;
}

function serieZeichnen(punkte: Punkt[], farbe: string) {
  if (punkte.length === 0) {
    return null;
  }
  if (punkte.length === 1) {
    return <circle cx={punkte[0].x} cy={punkte[0].y} r="3" fill={farbe} />;
  }
  return (
    <polyline
      fill="none"
      stroke={farbe}
      strokeWidth="2"
      strokeLinejoin="round"
      points={punkte.map((punkt) => `${punkt.x},${punkt.y}`).join(" ")}
    />
  );
}

/**
 * Verlaufs-Graph (Phase 4): zeitbasierte X-Achse über beide Serien —
 * die JSONL-Scan-History (Violett) und die Live-Snapshots aus SQLite
 * (Türkis). Der JSONL-Vertrag bleibt unangetastet; der Zeitraum filtert
 * nur die Anzeige.
 */
export function HistoryGraph({
  daten,
  liveDaten = [],
  metric,
  zeitraum,
  onZeitraum,
  kompakt = false,
  breite = 520,
  hoehe = 160,
}: Props) {
  const stunden = stundenFuer(zeitraum);
  const grenze = stunden === null ? null : new Date(Date.now() - stunden * 3_600_000);

  const imZeitraum = (text: string): boolean => {
    if (!grenze) {
      return true;
    }
    const zeit = alsZeit(text);
    return !Number.isNaN(zeit.getTime()) && zeit >= grenze;
  };

  const jsonlGefiltert = daten.filter((punkt) => imZeitraum(punkt.zeitstempel));
  const liveGefiltert = liveDaten.filter((punkt) => imZeitraum(punkt.zeitstempel));

  const auswahl = (
    <div className="flex items-center justify-between">
      <div className="text-[12px] font-medium text-leise">Verlauf</div>
      <div className="flex gap-1">
        {ZEITRAEUME.map((eintrag) => (
          <button
            key={eintrag.wert}
            onClick={() => onZeitraum(eintrag.wert)}
            className={`rounded-knopf px-2 py-1 text-[11px] transition ${
              zeitraum === eintrag.wert ? "bg-white/12 text-tinte" : "text-leise hover:bg-white/6"
            }`}
          >
            {eintrag.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (jsonlGefiltert.length + liveGefiltert.length < 2) {
    return (
      <div className="flex flex-col gap-2">
        {!kompakt && auswahl}
        <div className="text-center text-leise text-[11px] py-4">
          Nicht genügend Daten für einen Graph.
        </div>
      </div>
    );
  }

  const wertVonScan = (punkt: HistoryPoint): number =>
    metric === "dateien" ? punkt.metriken.anzahl_dateien : punkt.metriken.gesamt_zeilen;
  const wertVonLive = (punkt: LiveZeitreihePunkt): number =>
    metric === "dateien" ? punkt.dateien : punkt.zeilen;

  const werte = [...jsonlGefiltert.map(wertVonScan), ...liveGefiltert.map(wertVonLive)];
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const bereich = max - min || 1;

  const zeiten = [
    ...jsonlGefiltert.map((punkt) => alsZeit(punkt.zeitstempel)),
    ...liveGefiltert.map((punkt) => alsZeit(punkt.zeitstempel)),
  ].filter((zeit) => !Number.isNaN(zeit.getTime()));
  const start = Math.min(...zeiten.map((zeit) => zeit.getTime()));
  const ende = Math.max(...zeiten.map((zeit) => zeit.getTime()));
  const spanne = Math.max(ende - start, 1);

  const xVon = (text: string): number =>
    (alsZeit(text).getTime() - start) / spanne * breite;
  const yVon = (wert: number): number => hoehe - ((wert - min) / bereich) * hoehe;

  const livePunkte = liveGefiltert.map((punkt) => ({
    x: xVon(punkt.zeitstempel),
    y: yVon(wertVonLive(punkt)),
  }));
  const scanPunkte = jsonlGefiltert.map((punkt) => ({
    x: xVon(punkt.zeitstempel),
    y: yVon(wertVonScan(punkt)),
  }));

  const achsen = [0, 1 / 3, 2 / 3, 1]
    .map((anteil) => new Date(start + anteil * spanne))
    // Doppelte Labels glätten (kurze Zeiträume landen zweimal auf einem Tag);
    // Index 0 hat keinen Vorgänger und bleibt immer erhalten.
    .filter((zeit, index, liste) => index === 0 || achsenText(zeit, stunden) !== achsenText(liste[index - 1], stunden));

  return (
    <div className="flex flex-col gap-1.5">
      {!kompakt && auswahl}
      <div className="flex justify-between text-[10px] text-leise/60">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <svg
        width="100%"
        height={hoehe}
        viewBox={`0 0 ${breite} ${hoehe}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {serieZeichnen(livePunkte, "#22d3ee")}
        {serieZeichnen(scanPunkte, "#a78bfa")}
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-leise/50">
        {achsen.map((zeit, index) => (
          <span key={index}>{achsenText(zeit, stunden)}</span>
        ))}
      </div>
      {!kompakt && (
        <div className="flex gap-3 text-[10px] text-leise/70">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full" style={{ background: "#22d3ee" }} />
            Live (SQLite)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full" style={{ background: "#a78bfa" }} />
            Scans (History)
          </span>
        </div>
      )}
    </div>
  );
}
