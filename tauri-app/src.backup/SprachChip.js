"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SprachChip = SprachChip;
const sprachFarben_1 = require("./sprachFarben");
/** Sprachindikator als Chip (Farbe + Name). */
function SprachChip({ sprache }) {
    const stil = (0, sprachFarben_1.stilFuer)(sprache);
    return (<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-linie bg-white/2 px-2 py-0.5 text-[11px] font-medium" title={sprache}>
      <span className="size-[7px] flex-none rounded-full" style={{ background: stil.farbe }}/>
      {sprache}
    </span>);
}
