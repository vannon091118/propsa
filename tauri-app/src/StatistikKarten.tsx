import type { ReactNode } from "react";
import { SymbolDatei, SymbolEbenen, SymbolKlammern, SymbolPaket } from "./Symbole";
import type { ScanErgebnis } from "./typen";
import { stilFuer } from "./sprachFarben";
import { useZaehler } from "./useZaehler";
import { komma, zahl } from "./zahl";

type Props = {
  ergebnis: ScanErgebnis;
};

/** Eine Kennzahl-Karte mit animiertem Wert, Symbol und Untertitel. */
function Karte({
  titel,
  wert,
  hinweis,
  symbol,
  farbe,
}: {
  titel: string;
  wert: string;
  hinweis: string;
  symbol: ReactNode;
  farbe: string;
}) {
  return (
    <div className="rounded-panel border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-neon-cyan/40 hover:shadow-neon-cyan">
      <div className={`mb-1.5 ${farbe}`}>{symbol}</div>
      <div className="text-xl font-semibold tracking-tight text-tinte">{wert}</div>
      <div className="text-[11px] uppercase tracking-[0.05em] text-leise">{titel}</div>
      <div className="mt-0.5 text-[11px] text-leise/75">{hinweis}</div>
    </div>
  );
}

/** Zeilen je Sprache, absteigend. */
function nachSprache(ergebnis: ScanErgebnis) {
  const proSprache = new Map<string, number>();
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
export function StatistikKarten({ ergebnis }: Props) {
  const dateien = useZaehler(ergebnis.dateien.length);
  const zeilen = useZaehler(ergebnis.gesamt_zeilen);
  const sprachen = useZaehler(
    new Set(ergebnis.dateien.map((datei) => datei.sprache)).size,
  );
  const kilobyte = useZaehler(Math.round(ergebnis.gesamt_zeichen / 1024));
  const umfang =
    kilobyte >= 1024 ? `${komma(kilobyte / 1024)} MB` : `${zahl(kilobyte)} KB`;

  const verteilung = nachSprache(ergebnis);

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
        <Karte
          titel="Dateien"
          wert={zahl(dateien)}
          hinweis="im Kontext enthalten"
          symbol={<SymbolDatei className="size-5" />}
          farbe="text-neon-cyan"
        />
        <Karte
          titel="Zeilen"
          wert={zahl(zeilen)}
          hinweis="über alle Dateien"
          symbol={<SymbolKlammern className="size-5" />}
          farbe="text-neon-violett"
        />
        <Karte
          titel="Umfang"
          wert={umfang}
          hinweis="Zeichen im Export"
          symbol={<SymbolPaket className="size-5" />}
          farbe="text-ok"
        />
        <Karte
          titel="Sprachen"
          wert={String(sprachen)}
          hinweis="mit Inhalt erkannt"
          symbol={<SymbolEbenen className="size-5" />}
          farbe="text-neon-magenta"
        />
      </div>

      {verteilung.length > 0 && (
        <>
          <div
            className="animate-wachsen flex h-2 origin-left overflow-hidden rounded-full bg-white/6"
            title="Anteile der Sprachen an den Zeilen"
          >
            {verteilung.map((eintrag) => (
              <span
                key={eintrag.sprache}
                className="h-full transition duration-200 hover:brightness-125"
                style={{
                  width: `${eintrag.anteil}%`,
                  background: stilFuer(eintrag.sprache).farbe,
                  boxShadow: `0 0 10px ${stilFuer(eintrag.sprache).farbe}66`,
                }}
                title={`${eintrag.sprache}: ${eintrag.anteil.toFixed(0)} %`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-[7px]">
            {verteilung.slice(0, 5).map((eintrag) => (
              <div
                className="grid grid-cols-[92px_1fr_74px] items-center gap-2.5 text-[12px]"
                key={eintrag.sprache}
              >
                <span className="truncate" title={eintrag.sprache}>
                  {eintrag.sprache}
                </span>
                <span className="h-[7px] overflow-hidden rounded-full bg-white/6">
                  <span
                    className="animate-wachsen block h-full origin-left rounded-full"
                    style={{
                      width: `${eintrag.anteil}%`,
                      background: stilFuer(eintrag.sprache).farbe,
                      boxShadow: `0 0 8px ${stilFuer(eintrag.sprache).farbe}55`,
                    }}
                  />
                </span>
                <span className="text-[11px] text-leise">
                  {zahl(eintrag.zeilen)} Z · {eintrag.anteil.toFixed(0)} %
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
