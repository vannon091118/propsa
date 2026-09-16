"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hotspots = Hotspots;
const SprachChip_1 = require("./SprachChip");
const zahl_1 = require("./zahl");
/** Anzahl der Dateien in der Rangliste. */
const ANZAHL = 5;
/**
 * Die größten Dateien als Rangliste.
 *
 * Pendant zu den Hotspots des CLI-Dashboards – ein Blick, um Kandidaten für
 * einen Schnitt zu finden, ohne die Tabelle zu durchsuchen.
 */
function Hotspots({ ergebnis }) {
    const rangliste = [...ergebnis.dateien]
        .sort((a, b) => b.zeilen - a.zeilen)
        .slice(0, ANZAHL);
    if (rangliste.length === 0) {
        return null;
    }
    const groesste = rangliste[0].zeilen || 1;
    return (<section className="animate-einfahren flex flex-col gap-2">
      <h3 className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-leise">
        Hotspots <span className="text-[11px] text-leise">größte Dateien</span>
      </h3>
      <ol className="flex list-none flex-col gap-1.5 p-0">
        {rangliste.map((datei, index) => (<li className="grid animate-gleiten grid-cols-[24px_minmax(160px,1fr)_auto_80px_84px] items-center gap-2.5 text-[12px] [animation-delay:calc(var(--i)*45ms)]" key={datei.relativer_pfad} style={{ "--i": index }}>
            <span className="grid size-[22px] place-items-center rounded-full bg-neon-cyan/15 text-[11px] font-semibold text-neon-cyan shadow-[0_0_10px_rgb(34_211_238/0.25)]">
              {index + 1}
            </span>
            <span className="truncate font-mono">{datei.relativer_pfad}</span>
            <SprachChip_1.SprachChip sprache={datei.sprache}/>
            <span className="text-right tabular-nums text-tinte">
              {(0, zahl_1.zahl)(datei.zeilen)}
            </span>
            <span className="block h-[5px] min-w-[3px] rounded-full bg-gradient-to-r from-neon-cyan to-neon-violett transition-[width]" style={{ width: `${(datei.zeilen / groesste) * 100}%` }}/>
          </li>))}
      </ol>
    </section>);
}
