"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatistikKarten = StatistikKarten;
const Symbole_1 = require("./Symbole");
const sprachFarben_1 = require("./sprachFarben");
const useZaehler_1 = require("./useZaehler");
const zahl_1 = require("./zahl");
/** Eine Kennzahl-Karte mit animiertem Wert, Symbol und Untertitel. */
function Karte({ titel, wert, hinweis, symbol, farbe, }) {
    return (<div className="rounded-panel border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-neon-cyan/40 hover:shadow-neon-cyan">
      <div className={`mb-1.5 ${farbe}`}>{symbol}</div>
      <div className="text-xl font-semibold tracking-tight text-tinte">{wert}</div>
      <div className="text-[11px] uppercase tracking-[0.05em] text-leise">{titel}</div>
      <div className="mt-0.5 text-[11px] text-leise/75">{hinweis}</div>
    </div>);
}
/** Zeilen je Sprache, absteigend. */
function nachSprache(ergebnis) {
    const proSprache = new Map();
    for (const datei of ergebnis.dateien) {
        proSprache.set(datei.sprache, (proSprache.get(datei.sprache) ?? 0) + datei.zeilen);
    }
    const gesamt = ergebnis.gesamt_zeilen || 1;
    return [...proSprache.entries()]
        .map(([sprache, zeilen]) => ({
        sprache,
        zeilen,
        anteil: (zeilen / gesamt) * 100,
    }))
        .sort((a, b) => b.zeilen - a.zeilen);
}
/** Kennzahlen, Anteile auf einen Blick und die fünf größten Sprachen. */
function StatistikKarten({ ergebnis }) {
    const dateien = (0, useZaehler_1.useZaehler)(ergebnis.dateien.length);
    const zeilen = (0, useZaehler_1.useZaehler)(ergebnis.gesamt_zeilen);
    const sprachen = (0, useZaehler_1.useZaehler)(new Set(ergebnis.dateien.map((datei) => datei.sprache)).size);
    const kilobyte = (0, useZaehler_1.useZaehler)(Math.round(ergebnis.gesamt_zeichen / 1024));
    const umfang = kilobyte >= 1024 ? `${(0, zahl_1.komma)(kilobyte / 1024)} MB` : `${(0, zahl_1.zahl)(kilobyte)} KB`;
    const verteilung = nachSprache(ergebnis);
    return (<>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
        <Karte titel="Dateien" wert={(0, zahl_1.zahl)(dateien)} hinweis="im Kontext enthalten" symbol={<Symbole_1.SymbolDatei className="size-5"/>} farbe="text-neon-cyan"/>
        <Karte titel="Zeilen" wert={(0, zahl_1.zahl)(zeilen)} hinweis="über alle Dateien" symbol={<Symbole_1.SymbolKlammern className="size-5"/>} farbe="text-neon-violett"/>
        <Karte titel="Umfang" wert={umfang} hinweis="Zeichen im Export" symbol={<Symbole_1.SymbolPaket className="size-5"/>} farbe="text-ok"/>
        <Karte titel="Sprachen" wert={String(sprachen)} hinweis="mit Inhalt erkannt" symbol={<Symbole_1.SymbolEbenen className="size-5"/>} farbe="text-neon-magenta"/>
      </div>

      {verteilung.length > 0 && (<>
          <div className="animate-wachsen flex h-2 origin-left overflow-hidden rounded-full bg-white/6" title="Anteile der Sprachen an den Zeilen">
            {verteilung.map((eintrag) => (<span key={eintrag.sprache} className="h-full transition duration-200 hover:brightness-125" style={{
                    width: `${eintrag.anteil}%`,
                    background: (0, sprachFarben_1.stilFuer)(eintrag.sprache).farbe,
                    boxShadow: `0 0 10px ${(0, sprachFarben_1.stilFuer)(eintrag.sprache).farbe}66`,
                }} title={`${eintrag.sprache}: ${eintrag.anteil.toFixed(0)} %`}/>))}
          </div>

          <div className="flex flex-col gap-[7px]">
            {verteilung.slice(0, 5).map((eintrag) => (<div className="grid grid-cols-[92px_1fr_74px] items-center gap-2.5 text-[12px]" key={eintrag.sprache}>
                <span className="truncate" title={eintrag.sprache}>
                  {eintrag.sprache}
                </span>
                <span className="h-[7px] overflow-hidden rounded-full bg-white/6">
                  <span className="animate-wachsen block h-full origin-left rounded-full" style={{
                    width: `${eintrag.anteil}%`,
                    background: (0, sprachFarben_1.stilFuer)(eintrag.sprache).farbe,
                    boxShadow: `0 0 8px ${(0, sprachFarben_1.stilFuer)(eintrag.sprache).farbe}55`,
                }}/>
                </span>
                <span className="text-[11px] text-leise">
                  {(0, zahl_1.zahl)(eintrag.zeilen)} Z · {eintrag.anteil.toFixed(0)} %
                </span>
              </div>))}
          </div>
        </>)}
    </>);
}
