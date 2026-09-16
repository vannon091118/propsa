"use strict";
/**
 * Hintergrund: schwebende Lichtflächen und ein angedeutetes Netz aus Knoten.
 *
 * Rein dekorativ, ohne Zeigerereignisse und ohne Zufall – dieselben Werte bei
 * jedem Start, damit die Oberfläche reproduzierbar bleibt. Die Bewegung
 * entfällt bei `prefers-reduced-motion` (siehe `stile.css`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hintergrund = Hintergrund;
/** Feste Knoten des Netzes (Prozent der Fläche). */
const KNOTEN = [
    [4, 18], [16, 9], [28, 22], [41, 12], [54, 25], [67, 11], [79, 21], [92, 13],
    [8, 46], [21, 58], [34, 44], [47, 62], [60, 47], [73, 60], [86, 45], [96, 57],
];
/** Verbindungen als Indexpaare in `KNOTEN`. */
const KANTEN = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
    [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15],
    [0, 8], [1, 9], [2, 10], [3, 11], [4, 12], [5, 13], [6, 14], [7, 15],
];
function Hintergrund() {
    return (<div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="animate-schweben absolute -left-40 -top-48 size-[520px] rounded-full bg-neon-cyan/10 blur-[120px]"/>
      <div className="animate-schweben-langsam absolute -right-32 top-1/4 size-[460px] rounded-full bg-neon-violett/12 blur-[130px]"/>
      <div className="animate-glowen absolute -bottom-48 left-1/4 size-[420px] rounded-full bg-neon-magenta/10 blur-[140px]"/>

      <svg className="absolute inset-0 size-full text-neon-cyan opacity-[0.16]" preserveAspectRatio="none" viewBox="0 0 100 100">
        {KANTEN.map(([von, bis]) => (<line key={`k-${von}-${bis}`} x1={KNOTEN[von][0]} y1={KNOTEN[von][1]} x2={KNOTEN[bis][0]} y2={KNOTEN[bis][1]} stroke="currentColor" strokeWidth="0.08"/>))}
        {KNOTEN.map(([x, y]) => (<circle key={`n-${x}-${y}`} cx={x} cy={y} r="0.5" fill="currentColor"/>))}
      </svg>
    </div>);
}
