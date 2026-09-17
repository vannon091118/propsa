/**
 * Gemeinsame Transformations-Logik der Changelog-Kopie (eine Wahrheit):
 * Das Spiegel-Skript erzeugt damit die Kopien, `npm run pruefen` vergleicht
 * damit die Kopien gegen die Quelle. Nie an zweiter Stelle implementieren.
 */

/** Markdown-Links, die von der Kopie aus ins Leere zeigen, zu Klartext. */
export function changelogKopie(quellenText) {
  return quellenText
    // Lizenz-Link zuerst (En-Dash-sicher über die Link-Struktur).
    .replace(/\[[^\]]+\]\(\.\.\/\.\.\/LICENSE\)/g, "LICENSE im Projekt-Root")
    // Wiki-Link → "Label (siehe docs/wiki/ziel.im Projekt-Root)"
    .replace(/\[([^\]]+)\]\(([^)#]+?\.md)\)/g, (_ganz, label, ziel) =>
      `${label} (siehe docs/wiki/${ziel} im Projekt-Root)`,
    );
}
