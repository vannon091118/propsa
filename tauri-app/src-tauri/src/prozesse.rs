//! Kindprozesse versteckt starten – das dunkle Terminal-Fenster (CMD-Fenster
//! in den Vordergrund), das beim aktiven Zyklus aufblitzte, kommt von den
//! `git`-Aufrufen des Backends: `history.rs` ermittelt bei **jedem Tick**
//! die Projekt-Identität per `git rev-list …` und `update.rs` holt per
//! `git fetch`. Ohne zusätzliches Creation-Flag startet Windows für jeden
//! dieser Aufrufe eine eigene Konsole und holt sie in den Vordergrund —
//! genau das unterbricht beim Tippen.
//!
//! Die Lösung: Auf Windows bekommt jeder Kindprozess das Creation-Flag
//! `CREATE_NO_WINDOW` (0x0800_0000) mitgegeben, damit die Konsole gar
//! nicht erst sichtbar wird. Auf anderen Systemen ist das Flag unnötig
//! (und unbekannt), dort läuft der Aufruf unverändert.
//!
//! Aufrufer: `history.rs` (Identität je Tick), `update.rs` (Check + Update).
//! Ein fehlgeschlagener Spawn kehrt wie `Command::output` mit `Err` zurück
//! (Fail Loud beim Aufrufer, kein stiller Leerbefund).

use std::process::Command;

/// Creation-Flag `CREATE_NO_WINDOW`: Unterdrückt das Konsolenfenster des
/// Kindprozesses unter Windows vollständig (Wert laut Microsoft-Doku).
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Markiert einen `Command` als fensterlos: Unter Windows wird das
/// Creation-Flag gesetzt, sonst passiert nichts.
pub fn versteckt(kommando: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        kommando.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    {
        let _ = kommando; // Ohne Windows gibt es kein Konsolenfenster.
    }
}

/// `Command::output` mit unterdrücktem Konsolenfenster (Windows).
/// Signaturen spiegeln `Command::output`, damit die Aufrufer minimal bleiben.
pub fn output(kommando: &mut Command) -> Result<std::process::Output, std::io::Error> {
    versteckt(kommando);
    kommando.output()
}

/// `Command::status` mit unterdrücktem Konsolenfenster (Windows).
/// Wichtig für `update_ausfuehren`: Ohne das Flag würde auch die
/// Neuinstallation (npm run installieren) ein Terminal in den Vordergrund
/// holen – mitten im Update-Lauf.
pub fn status(kommando: &mut Command) -> Result<std::process::ExitStatus, std::io::Error> {
    versteckt(kommando);
    kommando.status()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Der Aufruf mit Flag kehrt mit `Ok` zurück, wenn das Programm existiert.
    #[test]
    fn git_version_laeuft_fensterlos() {
        let mut kommando = Command::new("git");
        kommando.arg("--version");
        let ergebnis = output(&mut kommando).expect("git --version nicht startbar");
        assert!(ergebnis.status.success());
        assert!(String::from_utf8_lossy(&ergebnis.stdout).contains("git"));
    }
}
