//! Sprach-Erkennung und Codeblock-Mapping für den Export.
//!
//! Die Tabellen spiegeln bewusst `src/scanner.ts` (Erkennung) und
//! `src/formatter.ts` (Markdown-Fence) der CLI, damit CLI und GUI bei
//! gleichem Input dieselben Sprachnamen und Fences erzeugen.

/// Ordnet einer Dateiendung einen Sprachnamen zu. Unbekannt ⇒ `Text`.
pub fn sprache_fuer_endung(endung: &str) -> &'static str {
    match endung.to_lowercase().as_str() {
        "ts" | "tsx" => "TypeScript",
        "js" | "jsx" => "JavaScript",
        "json" => "JSON",
        "md" | "mdx" => "Markdown",
        "css" => "CSS",
        "scss" => "SCSS",
        "less" => "LESS",
        "html" | "htm" => "HTML",
        "xml" => "XML",
        "yaml" | "yml" => "YAML",
        "py" => "Python",
        "go" => "Go",
        "rs" => "Rust",
        "java" => "Java",
        "cpp" | "cc" | "cxx" => "C++",
        "c" | "h" => "C",
        "sh" | "bash" | "env" => "Shell",
        "sql" => "SQL",
        "graphql" => "GraphQL",
        "toml" => "TOML",
        "cfg" | "ini" => "INI",
        _ => "Text",
    }
}

/// Markdown-Fence-Sprache für einen Sprachnamen.
///
/// Muss zu `codeBlockSpracheFür` in `src/formatter.ts` passen: dort wird
/// `JavaScript` als `javascript` und `TOML` als `toml` ausgegeben.
pub fn code_block_sprache(sprache: &str) -> &'static str {
    match sprache {
        "TypeScript" => "typescript",
        "JavaScript" => "javascript",
        "JSON" => "json",
        "Markdown" => "markdown",
        "CSS" => "css",
        "SCSS" => "scss",
        "LESS" => "less",
        "HTML" => "html",
        "XML" => "xml",
        "YAML" => "yaml",
        "TOML" => "toml",
        "Shell" => "bash",
        "Go" => "go",
        "Rust" => "rust",
        "Java" => "java",
        "C++" => "cpp",
        "C" => "c",
        "SQL" => "sql",
        "GraphQL" => "graphql",
        "INI" => "ini",
        _ => "text",
    }
}
