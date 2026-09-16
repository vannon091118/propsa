"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fortschrittsbalken = Fortschrittsbalken;
const zahl_1 = require("./zahl");
/** Fortschritt des laufenden Scans (bestimmt, sonst unbestimmt animiert). */
function Fortschrittsbalken({ fortschritt, sichtbar }) {
    if (!sichtbar) {
        return null;
    }
    const gesamt = fortschritt?.gesamt ?? 0;
    const gelesen = fortschritt?.gelesen ?? 0;
    const bekannt = gesamt > 0;
    const anteil = bekannt ? Math.min(100, (gelesen / gesamt) * 100) : 0;
    return (<div className="animate-einfahren flex flex-col gap-2 rounded-panel border border-white/10 bg-white/4 px-3.5 py-3">
      <div className="flex justify-between gap-3 text-[12px] text-leise">
        <span>
          {bekannt
            ? `${(0, zahl_1.zahl)(gelesen)} / ${(0, zahl_1.zahl)(gesamt)} Dateien · ${Math.round(anteil)} %`
            : "Sammle Dateien…"}
        </span>
        <span className="max-w-[70%] truncate font-mono text-[11px] text-neon-cyan">
          {fortschritt?.aktueller_pfad ?? ""}
        </span>
      </div>

      <div className="h-[7px] overflow-hidden rounded-full bg-white/6">
        <div className={`h-full rounded-full bg-gradient-to-r from-neon-cyan via-akzent to-neon-violett shadow-neon-cyan ${bekannt ? "" : "streifen-unbestimmt w-[35%] animate-schimmern"}`} style={bekannt ? { width: `${anteil}%` } : undefined}/>
      </div>

      {fortschritt && (fortschritt.uebersprungen > 0 || fortschritt.zeilen > 0) && (<div className="flex justify-between gap-3 text-[12px] text-leise">
          <span>{(0, zahl_1.zahl)(fortschritt.zeilen)} Zeilen gelesen</span>
          <span>
            {fortschritt.uebersprungen > 0
                ? `⚠ ${fortschritt.uebersprungen} übersprungen`
                : ""}
          </span>
        </div>)}
    </div>);
}
