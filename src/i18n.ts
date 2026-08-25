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
  introPrivacy: "Nothing is uploaded. Your data stays in your browser.",

  trust: "Everything stays in your browser",
  pasteLabel: "Paste a table here",
  placeholder: "Press Cmd/Ctrl+V anywhere on this page, or type tab-separated rows here.",
  clear: "Clear",
  readAs: "Read as",
  sourceHtml: "text/html",
  sourceTsv: "tab-separated",
  sourceText: "plain text",
  confidenceMedium: "medium confidence",
  confidenceLow: "low confidence",

  warningsTitle: "What the parser changed",
  warningsEnglishOnly: "Parser notes are currently only available in English.",

  preview: "Preview",
  emptyState:
    "Nothing pasted yet. Copy a table from an email, Slack, Notion, Jira or any web page, then press Cmd/Ctrl+V. Parsing happens here on your machine. Nothing is uploaded.",
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

  footerA: "No backend. No accounts. No analytics. Nothing is stored between visits.",
  footerB:
    "Deterministic parsing only. The parser reports what it changed instead of guessing.",
} as const;

export type StringKey = keyof typeof en;

const de: Record<StringKey, string> = {
  langName: "Deutsch",
  introHeadline: "Kaputte Tabelle rein. Saubere Tabelle raus.",
  introBody:
    "Kopiere eine kaputte oder verschobene Tabelle aus Excel, Google Sheets, einer Website, E-Mail, einem Chat oder Notion. TableUnfuck bringt die Struktur wieder in Ordnung und gibt sie als saubere Tabelle, Markdown, TSV oder JSON aus.",
  introPrivacy: "Nichts wird hochgeladen. Deine Daten bleiben im Browser.",

  trust: "Alles bleibt in deinem Browser",
  pasteLabel: "Tabelle hier einfügen",
  placeholder:
    "Drücke Cmd/Strg+V irgendwo auf dieser Seite oder tippe tabgetrennte Zeilen ein.",
  clear: "Zurücksetzen",
  readAs: "Gelesen als",
  sourceHtml: "text/html",
  sourceTsv: "tabgetrennt",
  sourceText: "Klartext",
  confidenceMedium: "mittlere Sicherheit",
  confidenceLow: "geringe Sicherheit",

  warningsTitle: "Was der Parser geändert hat",
  warningsEnglishOnly: "Die Parser-Hinweise sind derzeit nur auf Englisch verfügbar.",

  preview: "Vorschau",
  emptyState:
    "Noch nichts eingefügt. Kopiere eine Tabelle aus einer E-Mail, aus Slack, Notion, Jira oder einer beliebigen Webseite und drücke Cmd/Strg+V. Die Verarbeitung passiert hier auf deinem Gerät. Nichts wird hochgeladen.",
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
    "Kein Backend. Keine Konten. Kein Tracking. Zwischen Besuchen wird nichts gespeichert.",
  footerB:
    "Rein deterministisches Parsen. Der Parser meldet, was er geändert hat, statt zu raten.",
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { en, de };

export const LANGS: Lang[] = ["en", "de"];

/** Language is ephemeral on purpose: no localStorage, no cookie, no persistence. */
export const DEFAULT_LANG: Lang = "en";
