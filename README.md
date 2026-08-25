# TableUnfuck

Paste a broken table. Get clean Markdown, TSV or JSON.

100% client-side. No backend, no accounts, no analytics, no storage. The clipboard never
leaves the page.

```bash
npm install
npm run dev      # local dev server
npm test         # 35 tests
npm run build    # type-check + production build
```

## Architecture

```
src/
  lib/
    types.ts           ParsedTable — the one canonical model
    normalize.ts       normalizeCellText(), elementToText(), rectangularize()
    parseHtml.ts       parseHtmlTable()   — DOMParser + grid placement
    parseText.ts       parsePlainText()   — tabs → aligned columns → lines
    parseClipboard.ts  flavour selection (text/html preferred)
    render.ts          toMarkdown(), toTsv(), toJson()
  App.tsx              the only component
  styles.css
```

Every parser and renderer is a pure function with no React and no DOM ownership. `App.tsx`
holds state and nothing else. Runtime dependencies: `react`, `react-dom`.

## Parsing strategy

**HTML (preferred).** `DOMParser` → pick the table that actually holds data (email layout
wrappers score near zero, so the inner table wins) → walk `<tr>` in order, taking only
cells that belong to that table → place each cell into an occupancy grid so `rowspan` and
`colspan` land in the right coordinates. Inline markup is flattened to text; `<br>` and
block elements become line breaks; entities decode through the DOM itself.

**Plain text (fallback), in order:**

1. **Tabs** — if any line has a tab, split every line on tabs.
2. **Aligned columns** — split on runs of 2+ spaces, but only when every non-empty line
   yields the *same* field count ≥ 2, no field exceeds 60 characters, and no field is
   empty. Prose uses single spaces, so it never reaches this branch. Marked
   *medium confidence*.
3. **Lines only** — one cell per line, marked *low confidence*, with a visible warning.

## What it will not do

- Duplicate a merged cell's text into the cells it spanned (origin cell keeps it, the rest
  stay empty, and a warning says so).
- Invent column names. Markdown without a known header gets a **blank** header row rather
  than `Column 1`; JSON objects are only produced from a real header row with unique,
  non-empty names.
- Split prose into columns.
- Drop empty cells or short rows silently — rows are padded and the padding is reported.

## Warnings surfaced in the UI

Multiple tables in the clipboard · nested layout tables · merged cells flattened ·
unusable `rowspan="0"` / `colspan="0"` · ragged rows padded · HTML with no `<table>` ·
columns split on whitespace · no structure detected · nothing to parse.

## Out of scope (deliberately)

PDF, OCR, XLS/XLSX, CSV file upload, AI cleanup, table merging, formulas, spreadsheet
editing, cloud sync, accounts, history, collaboration.
