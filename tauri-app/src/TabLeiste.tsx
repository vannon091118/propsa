type Props = {
  aktiv: "scan" | "einstellungen";
  onWechsel: (tab: "scan" | "einstellungen") => void;
};

/**
 * Tab-Leiste unter der Titelzeile: **Scan | Einstellungen**. Der alte
 * Changelog-Tab ist entfallen — der vollständige Changelog liegt im
 * Einstellungen-Tab, die Notizen zur Version hinter der klickbaren
 * Versionsnummer (`UpdateBereich.tsx`).
 */
export function TabLeiste({ aktiv, onWechsel }: Props) {
  const knopf = (tab: "scan" | "einstellungen", beschriftung: string, label: string) => (
    <button
      onClick={() => onWechsel(tab)}
      className={`
        flex-1 items-center justify-center py-2 text-leise
        ${aktiv === tab ? 'border-b-2 border-neon-cyan' : 'border-b-transparent hover:bg-leise/10'}
      `}
      aria-label={label}
    >
      {beschriftung}
    </button>
  );

  return (
    <div className="flex flex-row border-b border-leise/20">
      {knopf("scan", "Scan", "Scan-Ansicht")}
      {knopf("einstellungen", "Einstellungen", "Einstellungen-Ansicht")}
    </div>
  );
}
