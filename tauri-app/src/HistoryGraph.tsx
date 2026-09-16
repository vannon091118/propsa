import React from "react";

export interface HistoryPoint {
  zeitstempel: string;
  metriken: {
    anzahl_dateien: number;
    gesamt_zeilen: number;
  };
}

interface Props {
  daten: HistoryPoint[];
  metric: "dateien" | "zeilen";
}

export function HistoryGraph({ daten, metric }: Props) {
  if (daten.length < 2) {
    return (
      <div className="text-center text-leise text-[11px] py-4">
        Nicht genügend Daten für einen Graph.
      </div>
    );
  }

  const values = daten.map(d => metric === "dateien" ? d.metriken.anzahl_dateien : d.metriken.gesamt_zeilen);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 200;
  const height = 40;
  const step = width / (daten.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] text-leise/60">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          className="text-neon-cyan"
          points={points}
        />
        {daten.map((d, i) => (
          <circle
            key={i}
            cx={i * step}
            cy={height - ((values[i] - min) / range) * height}
            r="2"
            className="fill-white"
          />
        ))}
      </svg>
    </div>
  );
}
