/**
 * A flat dictionary, not an i18n framework. Two languages, no plurals beyond
 * row/column, no interpolation beyond numbers the caller formats itself.
 *
 * Deliberately out of scope: parser warnings. Those strings are produced deep in
 * parseHtml/parseText (one of them interpolates a table count), and translating
 * them would mean turning the parser's diagnostics into codes, which this slice is
 * not allowed to do. They stay English, and the UI says so.
 */
export type Lang = "en" | "de";

const en = {
  langName: "English",
  introHeadline: "Messy table in. Clean table out.",
  introBody:
    "Paste a broken table from Excel, Google Sheets, a website, email, chat or Notion. TableUnfuck cleans up the structure and lets you copy it as a clean table, Markdown, TSV or JSON.",
  introPrivacy:
    "Your table contents are processed locally in your browser and are not uploaded by TableUnfuck.",

  trust: "Table contents stay in your browser",
  pasteLabel: "Paste a table here",
  placeholder: "Press Cmd/Ctrl+V anywhere on this page, or type tab-separated rows here.",
  clear: "Clear input",
  readAs: "Detected as:",
  sourceHtml: "HTML table",
  sourceTsv: "Tab-separated table",
  sourceText: "Plain text",
  confidenceMedium: "Medium confidence",
  confidenceLow: "Low confidence",
  flavoursLabel: "Clipboard offered",

  warningsTitle: "What the parser changed",
  warningsEnglishOnly: "Parser notes are currently only available in English.",

  paste: "Paste",
  preview: "Preview",
  emptyState:
    "Nothing pasted yet. Copy a table from an email, Slack, Notion, Jira or any web page, then press Cmd/Ctrl+V. Parsing happens here on your machine. Table contents are not uploaded by TableUnfuck.",
  row: "row",
  rows: "rows",
  column: "column",
  columns: "columns",

  output: "Output",
  outputFormat: "Output format",
  tabTable: "Table",
  tabMarkdown: "Markdown",
  tabTsv: "TSV",
  tabJson: "JSON",
  helpTable: "Table: copy a clean table into documents, email or Notion",
  helpMarkdown: "Markdown: useful for ChatGPT, GitHub, Notion and documentation",
  helpTsv: "TSV: paste directly into Excel or Google Sheets",
  helpJson: "JSON: structured output for developers and other tools",

  firstRowHeader: "First row is the header",
  arrayOfObjects: "Array of objects",
  copy: "Copy",
  copyTable: "Copy table",
  copied: "Copied",
  copiedPlain: "Copied as text",
  copyFailed: "Copy failed",

  markdownNoHeader:
    "Markdown tables need a header row, so this one is blank. Tick “First row is the header” if row one really is the header. No column names are invented.",
  tableNoHeader:
    "No header row is marked, so every row is a plain data row. Tick “First row is the header” if row one really is the header. No column names are invented.",
  richCopyNote:
    "Copies as a real table for Word, Outlook, Gmail, Google Docs or Notion, with TSV as the plain-text fallback. Not every target keeps the styling.",

  footerA:
    "No backend. No accounts. No analytics. TableUnfuck does not persist table contents between visits.",
  footerB:
    "Deterministic parsing only. The parser reports what it changed instead of guessing.",
  footerNavigation: "Footer links",
  privacyLink: "Privacy",
  imprintLink: "Imprint",
  madeByDebother: "Made by debother.",
  githubLink: "GitHub",
} as const;

export type StringKey = keyof typeof en;

const de: Record<StringKey, string> = {
  langName: "Deutsch",
  introHeadline: "Kaputte Tabelle rein. Saubere Tabelle raus.",
  introBody:
    "Kopiere eine kaputte oder verschobene Tabelle aus Excel, Google Sheets, einer Website, E-Mail, einem Chat oder Notion. TableUnfuck bringt die Struktur wieder in Ordnung und gibt sie als saubere Tabelle, Markdown, TSV oder JSON aus.",
  introPrivacy:
    "Deine Tabelleninhalte werden lokal in deinem Browser verarbeitet und von TableUnfuck nicht hochgeladen.",

  trust: "Tabelleninhalte bleiben in deinem Browser",
  pasteLabel: "Tabelle hier einfügen",
  placeholder:
    "Drücke Cmd/Strg+V irgendwo auf dieser Seite oder tippe tabgetrennte Zeilen ein.",
  clear: "Eingabe leeren",
  readAs: "Erkannt als:",
  sourceHtml: "HTML-Tabelle",
  sourceTsv: "Tab-getrennte Tabelle",
  sourceText: "Klartext",
  confidenceMedium: "Mittlere Sicherheit",
  confidenceLow: "Geringe Sicherheit",
  flavoursLabel: "Zwischenablage lieferte",

  warningsTitle: "Was der Parser geändert hat",
  warningsEnglishOnly: "Die Parser-Hinweise sind derzeit nur auf Englisch verfügbar.",

  paste: "Einfügen",
  preview: "Vorschau",
  emptyState:
    "Noch nichts eingefügt. Kopiere eine Tabelle aus einer E-Mail, aus Slack, Notion, Jira oder einer beliebigen Webseite und drücke Cmd/Strg+V. Die Verarbeitung passiert hier auf deinem Gerät. Tabelleninhalte werden von TableUnfuck nicht hochgeladen.",
  row: "Zeile",
  rows: "Zeilen",
  column: "Spalte",
  columns: "Spalten",

  output: "Ausgabe",
  outputFormat: "Ausgabeformat",
  tabTable: "Tabelle",
  tabMarkdown: "Markdown",
  tabTsv: "TSV",
  tabJson: "JSON",
  helpTable: "Tabelle: als saubere Tabelle in Dokumente, E-Mails oder Notion kopieren",
  helpMarkdown: "Markdown: praktisch für ChatGPT, GitHub, Notion und Dokumentation",
  helpTsv: "TSV: direkt in Excel oder Google Sheets einfügen",
  helpJson: "JSON: strukturierte Ausgabe für Entwickler und andere Tools",

  firstRowHeader: "Erste Zeile ist die Kopfzeile",
  arrayOfObjects: "Array aus Objekten",
  copy: "Kopieren",
  copyTable: "Tabelle kopieren",
  copied: "Kopiert",
  copiedPlain: "Als Text kopiert",
  copyFailed: "Kopieren fehlgeschlagen",

  markdownNoHeader:
    "Markdown-Tabellen brauchen eine Kopfzeile, deshalb bleibt diese leer. Setze das Häkchen bei „Erste Zeile ist die Kopfzeile“, wenn Zeile eins wirklich die Kopfzeile ist. Spaltennamen werden nicht erfunden.",
  tableNoHeader:
    "Es ist keine Kopfzeile markiert, daher sind alle Zeilen normale Datenzeilen. Setze das Häkchen bei „Erste Zeile ist die Kopfzeile“, wenn Zeile eins wirklich die Kopfzeile ist. Spaltennamen werden nicht erfunden.",
  richCopyNote:
    "Wird als echte Tabelle für Word, Outlook, Gmail, Google Docs oder Notion kopiert, mit TSV als Klartext-Rückfallebene. Nicht jedes Ziel übernimmt die Formatierung.",

  footerA:
    "Kein Backend. Keine Konten. Kein Tracking. TableUnfuck speichert Tabelleninhalte nicht zwischen Besuchen.",
  footerB:
    "Rein deterministisches Parsen. Der Parser meldet, was er geändert hat, statt zu raten.",
  footerNavigation: "Footer-Links",
  privacyLink: "Datenschutz",
  imprintLink: "Impressum",
  madeByDebother: "Made by debother.",
  githubLink: "GitHub",
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { en, de };

export const LANGS: Lang[] = ["en", "de"];

/** Language is ephemeral on purpose: no localStorage, no cookie, no persistence. */
export const DEFAULT_LANG: Lang = "en";
