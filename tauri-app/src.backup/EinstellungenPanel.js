"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EinstellungenPanel = EinstellungenPanel;
const typen_1 = require("./typen");
const FELD = "flex flex-col gap-1.5";
const BESCHRIFTUNG = "text-[12px] font-medium text-leise";
const HINWEIS = "text-[11px] text-leise";
const EINGABE = "rounded-feld border border-white/12 bg-white/5 text-[13px] text-tinte transition-colors focus:border-neon-cyan";
const KLEIN = `w-[120px] px-2.5 py-[7px] ${EINGABE}`;
const BREIT = `w-full px-2.5 py-2 font-mono ${EINGABE}`;
const KNOPF = "rounded-knopf bg-gradient-to-r from-neon-cyan to-neon-violett px-3.5 py-2.5 text-[14px] font-semibold text-[#08111a] shadow-neon-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
/** Zahlenfeld: `null` bedeutet „kein Limit“ und wird leer dargestellt. */
function alsFeldwert(wert) {
    return wert === null ? "" : String(wert);
}
/** Linkes Panel: Pfadwahl, Guardrail-Limits und Filter. */
function EinstellungenPanel({ einstellungen, laedt, onAendern, onPfadWaehlen, onScan, }) {
    return (<section className="glas flex flex-col gap-3.5 overflow-auto rounded-panel p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-leise">
        Scan-Einstellungen
      </h2>

      <div className={FELD}>
        <label className={BESCHRIFTUNG}>Basisverzeichnis</label>
        <div className="flex gap-2">
          <input type="text" value={einstellungen.pfad} readOnly placeholder="Noch nicht gewählt…" className={`flex-1 px-2.5 py-2 ${EINGABE}`}/>
          <button onClick={onPfadWaehlen} disabled={laedt} className={KNOPF}>
            Ordner wählen…
          </button>
        </div>
      </div>

      <div className={FELD}>
        <label className={BESCHRIFTUNG}>Maximale Dateien (Guardrail)</label>
        <input type="number" min={1} max={10000} value={alsFeldwert(einstellungen.maxDateien)} onChange={(e) => onAendern({ maxDateien: e.target.value ? Number(e.target.value) : null })} className={KLEIN}/>
        <div className={HINWEIS}>Leer = kein Limit.</div>
      </div>

      <div className={FELD}>
        <label className={BESCHRIFTUNG}>Maximale Gesamtzeilen (Guardrail)</label>
        <input type="number" min={1} max={1000000} value={alsFeldwert(einstellungen.maxZeilen)} onChange={(e) => onAendern({ maxZeilen: e.target.value ? Number(e.target.value) : null })} className={KLEIN}/>
        <div className={HINWEIS}>Leer = kein Limit. Wird das Limit erreicht, bricht der Scan ab.</div>
      </div>

      <div className={FELD}>
        <label className={BESCHRIFTUNG}>Delta</label>
        <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
          <input type="checkbox" checked={einstellungen.delta} onChange={(e) => onAendern({ delta: e.target.checked })} className="size-4 cursor-pointer accent-akzent"/>
          <span>Änderungen zum letzten Lauf melden</span>
        </label>
        <div className={HINWEIS}>
          Legt ~/.propsa/history/&lt;identitaet&gt;.jsonl im
          Benutzerverzeichnis an; im Projekt bleibt nichts zurück.
          Identität: Root-Commit-Hash, sonst Pfad.
        </div>
      </div>

      <div className={FELD}>
        <label className={BESCHRIFTUNG}>Include-Muster (komma-getrennt, optional)</label>
        <input type="text" value={einstellungen.includeMuster} onChange={(e) => onAendern({ includeMuster: e.target.value })} placeholder="z.B. src/**/*.ts, src/**/*.tsx" className={BREIT}/>
        <div className={HINWEIS}>Leer lassen = alle nicht ausgeschlossenen Dateien.</div>
      </div>

      <div className={FELD}>
        <label className={BESCHRIFTUNG}>Exclude-Muster (komma-getrennt)</label>
        <input type="text" value={einstellungen.excludeMuster} onChange={(e) => onAendern({ excludeMuster: e.target.value })} placeholder="node_modules, __pycache__, .cache, …" className={BREIT}/>
        <div className={HINWEIS}>
          Standard: alles außer Abhängigkeiten, Caches und Build-Artefakten. Leer =
          wirklich alles.
        </div>
        <button type="button" className="self-start text-[11px] text-neon-cyan underline decoration-dotted transition-colors hover:text-[#7ad9ee]" onClick={() => onAendern({ ...typen_1.BASIS_EINSTELLUNGEN, pfad: einstellungen.pfad })}>
          Standard wiederherstellen
        </button>
      </div>

      <button onClick={onScan} disabled={laedt} className={`w-full ${KNOPF}`}>
        {laedt ? "Scanne…" : "Scan starten"}
      </button>
    </section>);
}
