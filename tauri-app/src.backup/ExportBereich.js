"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportBereich = ExportBereich;
/** Was im Paket entsteht – in der Reihenfolge der Dateien. */
const BESTANDTEILE = [
    ["Zusammenfassung.md", "Umfang, Domänen, Sprachen, größte Dateien"],
    ["Architektur.md", "Verzeichnisbaum und Dateiübersicht je Domäne"],
    ["Quellen/<Domäne>.md", "vollständiger Code, eine Datei je Root-Ordner"],
    ["Dokumentation.md", "alle Markdown-Dateien im Volltext"],
    ["kontext.json", "dieselben Daten maschinenlesbar"],
];
/** Schreibt das Kontextpaket in einen Ordner. */
function ExportBereich({ laedt, onSchreiben }) {
    return (<div className="flex flex-col gap-3 border-t border-white/10 pt-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-leise">
          Das Paket wird in einen Ordner geschrieben
        </span>
        <ul className="flex flex-col gap-1">
          {BESTANDTEILE.map(([name, zweck]) => (<li className="grid grid-cols-[168px_1fr] items-baseline gap-2 text-[12px]" key={name}>
              <code className="font-mono text-neon-cyan">{name}</code>
              <span className="text-leise">{zweck}</span>
            </li>))}
        </ul>
      </div>

      <button onClick={onSchreiben} disabled={laedt} className="w-full rounded-knopf bg-gradient-to-r from-ok to-neon-cyan px-3.5 py-2.5 text-[14px] font-semibold text-[#052015] shadow-neon-gruen transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
        {laedt ? "Schreibe Paket…" : "Zielordner wählen und Paket schreiben"}
      </button>
    </div>);
}
