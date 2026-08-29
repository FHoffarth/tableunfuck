# TableUnfuck

**Messy table in. Clean table out.**

[![Live](https://img.shields.io/badge/live-tableunfuck.com-14170f)](https://tableunfuck.com)
[![Deploy](https://github.com/debother/tableunfuck/actions/workflows/deploy.yml/badge.svg)](https://github.com/debother/tableunfuck/actions/workflows/deploy.yml)

Paste a broken table from Excel, Google Sheets, a website, email, chat or Notion.
TableUnfuck cleans up the structure and lets you copy it as a clean table, Markdown, TSV
or JSON.

**Live: [tableunfuck.com](https://tableunfuck.com)**

<!--
  SCREENSHOT: none in the repo yet. When you add one, it belongs right here, directly
  under the live link. A single wide shot with a table already pasted works best, so the
  preview and the Table output are both visible in one frame.
-->

Your table contents are processed locally in your browser and are not uploaded by
TableUnfuck.

## What it does

- **Clean table** output you can paste straight into Word, Outlook, Gmail, Google Docs or
  Notion as a real table
- **Markdown**, **TSV** and **JSON** output
- Reads **pasted HTML tables**, **tab separated** text and **space aligned** plaintext
- Detects a header row from real `<th>` evidence, and lets you set or unset it yourself
- Flattens merged cells (`rowspan` / `colspan`) into a plain grid and says that it did
- **EN / DE** interface
- Processes table contents locally in your browser

## Inputs it understands

Excel and Google Sheets, websites, email, chat, Notion, Jira, Slack, copied HTML tables,
tab separated text, and space aligned plaintext.

## Outputs

| Mode | Good for |
| --- | --- |
| **Table** | pasting a clean table into documents, email or Notion |
| **Markdown** | ChatGPT, GitHub, Notion, documentation |
| **TSV** | pasting straight into Excel or Google Sheets |
| **JSON** | developers and other tools |

Copying the table writes two clipboard flavours at once: `text/html` for rich text targets
and `text/plain` (TSV) for everything else. If the browser cannot write rich clipboard
data, it falls back to plain TSV and the button says so.

## Privacy

- Table contents are processed locally in your browser
- TableUnfuck does not upload or persist table contents, and the application has no
  backend
- No analytics, no tracking, no accounts
- The application uses no `localStorage`, no `sessionStorage`, no cookies and no IndexedDB
- Hosting-related request data is separate from table processing; see the central
  [Debother privacy notice](https://debother.com/privacy/)
- The parser reports what it changed instead of quietly guessing
- No column names are invented, ever

## How it works

**HTML is preferred.** `DOMParser` picks the table that actually holds data, so email
layout wrappers lose to the inner table. Cells are placed into an occupancy grid, which is
how `rowspan` and `colspan` land at the right coordinates. Inline markup flattens to text,
`<br>` and block elements become line breaks, entities decode through the DOM.

**Plain text is the fallback**, tried in order:

1. **Tabs.** If any line has a tab, split every line on tabs.
2. **Aligned columns.** Split on runs of 2 or more spaces, but only when every non empty
   line yields the same field count of at least 2, no field exceeds 60 characters and no
   field is empty. Prose uses single spaces, so it never reaches this branch. Marked
   *medium confidence*.
3. **Lines only.** One cell per line, marked *low confidence*, with a visible warning.

Every parser and renderer is a pure function with no React and no DOM ownership. `App.tsx`
holds state and nothing else. Runtime dependencies: `react` and `react-dom`.

## Development

```bash
npm install
npm run dev       # local dev server
```

Validation:

```bash
npm test          # unit and component tests
npm run build     # type check plus production build
npm audit         # dependency check
npm run preview   # serve the production build locally
```

Vite, React and TypeScript. Pushing to `main` runs the suite and deploys to
[tableunfuck.com](https://tableunfuck.com); a failing suite never reaches the live site.

**Architecture in short.** Parsing is deterministic: the same input always produces the
same table, with no heuristics that guess at intent. Everything funnels through
`ParsedTable`, the one canonical intermediate representation, and rendering is entirely
separate from parsing, so a new output format never touches parser code. The rich
clipboard write emits `text/html` plus a `text/plain` TSV fallback from that same
structure. Where the input is genuinely ambiguous, the uncertainty is carried through as
confidence levels and warnings rather than resolved by guessing.

```
src/
  lib/
    types.ts           ParsedTable: the one canonical model
    normalize.ts       normalizeCellText(), elementToText(), rectangularize()
    parseHtml.ts       parseHtmlTable():  DOMParser plus grid placement
    parseText.ts       parsePlainText():  tabs, then aligned columns, then lines
    parseClipboard.ts  flavour selection (text/html preferred)
    render.ts          toMarkdown(), toTsv(), toJson()
    toHtmlTable.ts     toHtmlTable():     semantic <table> for the clipboard
    clipboard.ts       buildTablePayload(), writeRichClipboard()
  i18n.ts              flat EN/DE dictionary
  App.tsx              the only component
  styles.css
```

## Technical notes

**What it will not do.** Duplicate a merged cell's text into the cells it spanned (the
origin cell keeps it, the rest stay empty, and a warning says so). Invent column names:
Markdown without a known header gets a blank header row rather than `Column 1`, and JSON
objects are only produced from a real header row with unique, non empty names. Split prose
into columns. Drop empty cells or short rows silently: rows are padded and the padding is
reported.

**Warnings surfaced in the UI.** Multiple tables in the clipboard, nested layout tables,
merged cells flattened, unusable `rowspan="0"` or `colspan="0"`, ragged rows padded, HTML
with no `<table>`, columns split on whitespace, no structure detected, nothing to parse.

**Language.** A flat EN / DE dictionary in `src/i18n.ts`. No i18n framework, no
localization service, no network. The selection is ephemeral, so a reload returns to
English. Switching language only selects strings: it never touches the input, the parsed
table or any output. Parser diagnostics are still English in both languages, and the
German warnings block says so.

**Rich text targets vary.** The table structure survives everywhere, the borders may not.

**Out of scope, deliberately.** PDF, OCR, XLS and XLSX, CSV file upload, AI cleanup, table
merging, formulas, spreadsheet editing, cloud sync, accounts, history, collaboration.

## Contributing

Small, focused fixes and reproducible parser cases are welcome. A case is most useful as
the exact input you pasted plus what you expected to get back.

Security issues can be reported privately through GitHub's vulnerability reporting
feature.

## License

MIT. See [LICENSE](LICENSE).
