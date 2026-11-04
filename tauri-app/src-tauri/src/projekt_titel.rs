use std::path::Path;

/// Shareable project label: final directory name only, never the local parent path.
pub fn projekt_titel(basis: &Path) -> String {
    basis
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "Projekt".to_string())
}

#[cfg(test)]
mod tests {
    use super::projekt_titel;
    use std::path::Path;

    #[test]
    fn projekt_titel_enthaelt_keine_elternpfade() {
        let titel = projekt_titel(Path::new("C:/Users/private/workspace/projekt"));
        assert_eq!(titel, "projekt");
        assert!(!titel.contains('/') && !titel.contains('\\'));
    }

    #[test]
    fn wurzelpfad_erhaelt_neutralen_titel() {
        assert_eq!(projekt_titel(Path::new("/")), "Projekt");
    }
}
