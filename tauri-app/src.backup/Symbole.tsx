type Props = {
  className?: string;
};

/**
 * Symbole der Kennzahl-Karten als Inline-SVG.
 *
 * Bewusst eigener Satz statt einer Icon-Bibliothek: vier Symbole rechtfertigen
 * keine zusätzliche Abhängigkeit.
 */
function Rahmen({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Dokument (Dateien). */
export function SymbolDatei({ className }: Props) {
  return (
    <Rahmen className={className}>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5" />
    </Rahmen>
  );
}

/** Code-Klammern (Zeilen). */
export function SymbolKlammern({ className }: Props) {
  return (
    <Rahmen className={className}>
      <path d="m9 7-5 5 5 5" />
      <path d="m15 7 5 5-5 5" />
    </Rahmen>
  );
}

/** Paket (Umfang). */
export function SymbolPaket({ className }: Props) {
  return (
    <Rahmen className={className}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 4 7.5" />
      <path d="M12 12v9" />
      <path d="m12 12 8-4.5" />
    </Rahmen>
  );
}

/** Ebenen (Sprachen). */
export function SymbolEbenen({ className }: Props) {
  return (
    <Rahmen className={className}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </Rahmen>
  );
}
