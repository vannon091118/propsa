//! Baustein-Vertrag: Spiegel von `packages/core/src/vertrag.ts`.
//!
//! Die sieben Bausteine sind in `bausteine/muster/` beschrieben und in
//! `bausteine/vertrage/` festgeschrieben. Dieses Modul liefert die Form, keine
//! Logik — Bausteine geben Verträge heraus, keinen Code.
//!
//! Wie bei `zwischenspeicher.rs` und `live_anomalie.rs` ist dies die einzige
//! Wahrheit in Rust; `npm run pruefen` vergleicht die drei Kataloge (Regel 9).

/// Die sieben Punkte, die eine Regel tragen muss, um als umgesetzt zu gelten.
pub fn gate_punkte(punkt: &str) -> &'static str {
    match punkt {
        "POSITIVE" => "der Fall, in dem die Regel gilt",
        "FORBIDDEN" => "der Fall, der abgewiesen wird",
        "FALLBACK" => "was bei Nichterfüllung passiert",
        "ERROR" => "maschinenlesbarer Fehlerstatus",
        "TRACE" => "Herkunfts- und Provenienzkette",
        "REPLAY" => "Replay-Verhalten",
        "INVARIANT" => "testbare Zusicherung",
        _ => "",
    }
}

/// Die vier Zustandswerte eines Vertragsabschnitts.
///
/// `STUB` und `NOT_VERIFIED` sind nicht dasselbe: ein `STUB` bedeutet, dass die
/// Entscheidung **nicht zu bauen** getroffen wurde – er ist eine Aufgabe. Ein
/// `NOT_VERIFIED` bedeutet, dass **gebaut** wurde und niemand geprüft hat – er
/// ist ein offener Prüfposten.
pub fn status_werte(status: &str) -> &'static str {
    match status {
        "IMPLEMENTED" => "gebaut und durch die sieben Punkte belegt",
        "STUB" => "Signatur steht, Logik fehlt – bewusst offen",
        "NOT_IMPLEMENTED" => "nicht angefangen",
        "NOT_VERIFIED" => "gebaut, aber die Belege fehlen",
        _ => "",
    }
}

/// Die sieben Ereignistypen der Beobachtung.
///
/// Fremde Bezeichner werden über eine Zuordnungstabelle in diese Typen
/// übersetzt. Ein neuer Produzent braucht eine Zeile in der Tabelle, keinen
/// Consumer-Code. Die Rohdaten bleiben dabei unverändert erhalten.
pub fn ereignis_typen(typ: &str) -> &'static str {
    match typ {
        "CLAIM" => "eine Aussage mit Herkunft",
        "CHALLENGE" => "ein Widerspruch zu einer Aussage",
        "LIFECYCLE" => "ein Zustandswechsel eines Bausteins",
        "VERDICT" => "das Urteil eines Gates",
        "HANDOFF" => "eine Übergabe zwischen zwei Instanzen",
        "COMPLETION" => "der Abschluss einer Arbeitseinheit",
        "DIAGNOSTIC" => "ein beobachteter Fehler ohne Eingriff",
        _ => "",
    }
}

/// Schichtlage. Übergaben laufen ausschließlich nach unten.
///
/// Eine Position allein ist kein Bautein: sie beschreibt, wo ein Baustein
/// einzuordnen wäre, nicht dass PROPAKT eine Position bekommt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Position {
    Praesentation = 0,
    Prompts = 1,
    Orchestrierung = 2,
    Infrastruktur = 3,
}

impl Position {
    /// Position aus einer Zahl, ohne Sprung. Nicht vergebene Werte sind `None`.
    pub fn aus_wert(wert: i32) -> Option<Position> {
        match wert {
            0 => Some(Position::Praesentation),
            1 => Some(Position::Prompts),
            2 => Some(Position::Orchestrierung),
            3 => Some(Position::Infrastruktur),
            _ => None,
        }
    }
}
