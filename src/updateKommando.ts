/**
 * Unterkommando `update` der CLI: Check + optionaler Update-Lauf.
 *
 * Bewusst eigenes Modul („Eine Aufgabe – ein Besitzer – ein Modul“) und
 * Registrierung vor `.parse()`, sonst wertet commander `update` als das
 * Pfad-Argument des Scans.
 */
import { Command } from 'commander';
import { updatePruefen, updateAusfuehren, UpdateFehler } from './update';

/** Registriert das `update`-Unterkommando am CLI-Programm. */
export function updateKommandoRegistrieren(program: Command): void {
  program
    .command('update')
    .description('Auf Updates über origin/main prüfen und übernehmen')
    .option('-n, --nur-pruefen', 'nur prüfen, nichts übernehmen')
    .action((options: { nurPruefen?: boolean }) => {
      console.log('🔄 Prüfe auf Updates (origin/main) …');
      const check = updatePruefen();
      if (!check.erreichbar) {
        console.error(`❌ Fernquelle nicht erreichbar: ${check.fehler ?? 'unbekannt'}`);
        process.exit(1);
      }
      console.log(`   lokal: ${check.lokal}`);
      console.log(`   fern:  ${check.fern}`);
      if (!check.update_verfuegbar) {
        console.log('✅ Alles aktuell.');
        return;
      }
      console.log('⬆️  Update verfügbar.');
      if (options.nurPruefen) {
        console.log('   (nur geprüft – zum Übernehmen: propsa update)');
        return;
      }
      console.log('▸ Übernehme Commits (fast-forward) und installiere neu …');
      try {
        const ergebnis = updateAusfuehren();
        console.log(
          `✅ Aktualisiert: ${ergebnis.vorher} → ${ergebnis.nachher} (neu installiert)`
        );
      } catch (fehler) {
        if (fehler instanceof UpdateFehler) {
          console.error(`⛔ ${fehler.message}`);
          process.exit(1);
        }
        throw fehler;
      }
    });
}
