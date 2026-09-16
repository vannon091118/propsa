import type { DeltaInfo } from "./typen";
import { zahl } from "./zahl";

type Props = {
  info: DeltaInfo;
};

function Liste({ titel, pfade, zeichen }: { titel: string; pfade: string[]; zeichen: string }) {
  if (pfade.length === 0) {
    return null;
  }
  return (
    <div>
      <div className="text-[11px] font-medium text-leise">
        {zeichen} {titel} ({zahl(pfade.length)})
      </div>
      <ul className="mt-1 max-h-28 overflow-auto font-mono text-[11px] leading-5">
        {pfade.slice(0, 20).map((pfad) => (
          <li key={pfad} className="truncate">
            {pfad}
          </li>
        ))}
        {pfade.length > 20 && (
          <li className="text-leise">… und {zahl(pfade.length - 20)} weitere</li>
        )}
      </ul>
    </div>
  );
}

/**
 * Delta-Anzeige: Änderungen zum letzten Lauf derselben Projekt-Identität.
 *
 * Die History (`~/.propsa/history/<identitaet>.jsonl`) führt das Backend;
 * hier wird nur der Vergleich aufbereitet.
 */
export function DeltaAnzeige({ info }: Props) {
  const kennung = info.identitaet.slice(0, 12);

  if (info.erstlauf || !info.delta) {
    return (
      <div className="animate-einfahren rounded-knopf border border-neon-cyan/35 bg-neon-cyan/8 px-3 py-2.5 text-[13px] text-tinte">
        <strong>Erstlauf</strong> – History angelegt (Identität über{" "}
        {info.herkunft === "root-commit" ? `Root-Commit ${kennung}` : "Pfad"}).
        Der nächste Delta-Scan vergleicht gegen diesen Stand.
      </div>
    );
  }

  const d = info.delta;
  const gesamt = d.neu.length + d.geaendert.length + d.entfernt.length;

  return (
    <div className="animate-einfahren flex flex-col gap-2.5 rounded-knopf border border-neon-violett/35 bg-neon-violett/8 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <strong className="text-tinte">Delta zum letzten Lauf</strong>
        <span className="text-leise">
          ({info.herkunft === "root-commit" ? `Root-Commit ${kennung}` : "Pfad-Identität"})
        </span>
        <span className="text-tinte">
          <span className="text-ok">+{zahl(d.neu.length)}</span> ·{" "}
          <span className="text-warnung">~{zahl(d.geaendert.length)}</span> ·{" "}
          <span className="text-fehler">−{zahl(d.entfernt.length)}</span> ·{" "}
          <span className="text-leise">{zahl(d.unveraendert.length)} unverändert</span>
        </span>
      </div>

      {gesamt === 0 && (
        <div className="text-[12px] text-leise">
          Keine Änderungen – der Scan entspricht genau dem letzten Lauf.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Liste titel="neu" pfade={d.neu} zeichen="+" />
        <Liste titel="geändert" pfade={d.geaendert} zeichen="~" />
        <Liste titel="entfernt" pfade={d.entfernt} zeichen="−" />
      </div>
    </div>
  );
}
