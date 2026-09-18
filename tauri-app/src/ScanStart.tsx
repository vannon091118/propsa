import type { ScanEinstellungen } from "./typen";

type Props = {
  einstellungen: ScanEinstellungen;
  laedt: boolean;
  onPfadWaehlen: () => void;
  onScan: () => void;
};

const EINGABE =
  "rounded-feld border border-white/12 bg-white/5 text-[13px] text-tinte transition-colors focus:border-neon-cyan";
const KNOPF =
  "rounded-knopf bg-gradient-to-r from-neon-cyan to-neon-violett px-3.5 py-2.5 text-[14px] font-semibold text-[#08111a] shadow-neon-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

/**
 * Linke Spalte des Scan-Tabs: nur die Startbedienung (Verzeichnis + Start).
 * Alle Optionen (Guards, Delta, Cache, Muster, API-Key) liegen im Tab
 * „Einstellungen“ — dort auch der vollständige Changelog.
 */
export function ScanStart({ einstellungen, laedt, onPfadWaehlen, onScan }: Props) {
  return (
    <section className="glas flex flex-col gap-3 rounded-panel p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-leise">
        Scan
      </h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-leise">Basisverzeichnis</label>
        <input
          type="text"
          value={einstellungen.pfad}
          readOnly
          placeholder="Noch nicht gewählt…"
          className={`w-full px-2.5 py-2 font-mono ${EINGABE}`}
        />
        <button onClick={onPfadWaehlen} disabled={laedt} className={KNOPF}>
          Ordner wählen…
        </button>
      </div>

      <button onClick={onScan} disabled={laedt} className={`w-full ${KNOPF}`}>
        {laedt ? "Scanne…" : "Scan starten"}
      </button>

      <p className="text-[11px] text-leise">
        Guards, Delta, Zwischenspeicher, Muster und API-Key liegen im Tab{" "}
        <strong className="text-tinte">Einstellungen</strong>.
      </p>
    </section>
  );
}
