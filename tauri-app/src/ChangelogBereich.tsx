import { MarkdownRenderer } from "./MarkdownRenderer";

type Props = {
  /** Vollständiger Changelog (Markdown) oder `null` beim Nachladen. */
  inhalt: string | null;
  laedt: boolean;
  /** Nochmal laden (z. B. nach einem Fehlversuch). */
  onNeuLaden: () => void;
};

/**
 * Changelog-Bereich im Tab „Einstellungen“: die vollständige, scrollbare
 * Liste aller Versionen (Markdown aus `resources/Changelog.md`).
 */
export function ChangelogBereich({ inhalt, laedt, onNeuLaden }: Props) {
  return (
    <section className="glas flex min-h-0 flex-col gap-3 rounded-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-leise">
          Changelog (alle Versionen)
        </h2>
        <button
          type="button"
          onClick={onNeuLaden}
          className="text-[11px] text-neon-cyan underline decoration-dotted transition-colors hover:text-[#7ad9ee]"
        >
          Neu laden
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {laedt ? (
          <div className="flex h-full items-center justify-center">
            <span className="animate-pulsieren text-leise">Lade Changelog…</span>
          </div>
        ) : inhalt ? (
          <MarkdownRenderer markdown={inhalt} />
        ) : (
          <p className="text-leise">Changelog nicht lesbar.</p>
        )}
      </div>
    </section>
  );
}
