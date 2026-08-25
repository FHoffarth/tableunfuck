import { useEffect, useMemo, useRef, useState } from "react";
import {
  describeAvailableFlavours,
  parseClipboard,
  readClipboardEvent,
  type ClipboardPayload,
} from "./lib/parseClipboard";
import { parsePlainText } from "./lib/parseText";
import { toJson, toMarkdown, toTsv, type JsonShape } from "./lib/render";
import type { ParsedTable } from "./lib/types";

type OutputTab = "markdown" | "tsv" | "json";

const TABS: { id: OutputTab; label: string }[] = [
  { id: "markdown", label: "Markdown" },
  { id: "tsv", label: "TSV" },
  { id: "json", label: "JSON" },
];

const SOURCE_LABEL: Record<ParsedTable["source"], string> = {
  html: "text/html",
  tsv: "tab-separated",
  text: "plain text",
};

export default function App() {
  const [raw, setRaw] = useState("");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [flavours, setFlavours] = useState<string[]>([]);
  const [tab, setTab] = useState<OutputTab>("markdown");
  const [jsonShape, setJsonShape] = useState<JsonShape>("arrays");
  const [useHeader, setUseHeader] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ingest = (payload: ClipboardPayload) => {
    const parsed = parseClipboard(payload);
    setTable(parsed);
    setFlavours(describeAvailableFlavours(payload));
    setUseHeader(parsed.hasHeaderEvidence);
    setCopied(false);
  };

  // One document-level listener, so Cmd/Ctrl+V works anywhere on the page.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const payload = readClipboardEvent(event);
      if (!payload.html && !payload.text) return;
      event.preventDefault();
      setRaw(payload.text ?? "");
      ingest(payload);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const onEdit = (value: string) => {
    setRaw(value);
    setFlavours(value.trim() ? ["text/plain"] : []);
    setCopied(false);
    if (!value.trim()) {
      setTable(null);
      return;
    }
    const parsed = parsePlainText(value);
    setTable(parsed);
    setUseHeader(false);
  };

  const clear = () => {
    setRaw("");
    setTable(null);
    setFlavours([]);
    setUseHeader(false);
    setCopied(false);
    textareaRef.current?.focus();
  };

  const json = useMemo(
    () =>
      table
        ? toJson(table, { useFirstRowAsHeader: useHeader, shape: jsonShape })
        : { text: "" },
    [table, useHeader, jsonShape],
  );

  const output = useMemo(() => {
    if (!table || table.rows.length === 0) return "";
    if (tab === "markdown") return toMarkdown(table, { useFirstRowAsHeader: useHeader });
    if (tab === "tsv") return toTsv(table);
    return json.text;
  }, [table, tab, useHeader, json]);

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      const el = document.createElement("textarea");
      el.value = output;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  const hasRows = !!table && table.rows.length > 0;
  const columns = hasRows ? table.rows[0].length : 0;

  return (
    <div className="shell">
      <header className="masthead">
        <h1 className="wordmark">
          Table<span>Unfuck</span>
        </h1>
        <p className="trust">Everything stays in your browser</p>
      </header>

      <p className="subline">
        Paste a broken table. Get clean Markdown, TSV or JSON.
      </p>

      <div className={`dropzone${raw ? " is-loaded" : ""}`}>
        <label className="sr-only" htmlFor="paste-input">
          Paste a table here
        </label>
        <textarea
          id="paste-input"
          ref={textareaRef}
          value={raw}
          spellCheck={false}
          onChange={(event) => onEdit(event.target.value)}
          placeholder="Press Cmd/Ctrl+V anywhere on this page, or type tab-separated rows here."
        />
        {!raw && <span className="zone-hint">⌘V / Ctrl+V</span>}
      </div>

      <div className="toolbar">
        {table && (
          <span className="badge is-source">Read as {SOURCE_LABEL[table.source]}</span>
        )}
        {flavours.map((flavour) => (
          <span className="badge" key={flavour}>
            {flavour}
          </span>
        ))}
        {table && table.confidence !== "high" && (
          <span className="badge is-low">{table.confidence} confidence</span>
        )}
        <span className="spacer" />
        {(raw || table) && (
          <button type="button" className="linkish" onClick={clear}>
            Clear
          </button>
        )}
      </div>

      <div aria-live="polite">
        {table && table.warnings.length > 0 && (
          <section className="warnings">
            <h2>What the parser changed</h2>
            <ul>
              {table.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <h2 className="section-label">Preview</h2>
      <div className="fanfold">
        <div className="sprockets" aria-hidden="true" />
        <div className="sheet">
          {hasRows ? (
            <table>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr
                    // eslint-disable-next-line react/no-array-index-key
                    key={rowIndex}
                    className={useHeader && rowIndex === 0 ? "is-header" : undefined}
                  >
                    {row.map((cell, cellIndex) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <td key={cellIndex}>
                        {cell === "" ? <span className="cell-empty">—</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">
              Nothing pasted yet. Copy a table from an email, Slack, Notion, Jira or any
              web page, then press Cmd/Ctrl+V. Parsing happens here on your machine —
              nothing is uploaded.
            </p>
          )}
        </div>
        <div className="sprockets is-right" aria-hidden="true" />
      </div>
      {hasRows && (
        <p className="rowcount">
          {table.rows.length} {table.rows.length === 1 ? "row" : "rows"} × {columns}{" "}
          {columns === 1 ? "column" : "columns"}
        </p>
      )}

      <h2 className="section-label">Output</h2>
      <div className="tabs" role="tablist" aria-label="Output format">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="output-panel"
            className="tab"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="output" id="output-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <div className="output-bar">
          <label className={`option${hasRows ? "" : " is-disabled"}`}>
            <input
              type="checkbox"
              checked={useHeader}
              disabled={!hasRows}
              onChange={(event) => setUseHeader(event.target.checked)}
            />
            First row is the header
          </label>

          {tab === "json" && (
            <label className={`option${useHeader ? "" : " is-disabled"}`}>
              <input
                type="checkbox"
                checked={jsonShape === "objects"}
                disabled={!useHeader}
                onChange={(event) =>
                  setJsonShape(event.target.checked ? "objects" : "arrays")
                }
              />
              Array of objects
            </label>
          )}

          <span className="spacer" />
          <button type="button" className="copy" onClick={copy} disabled={!output}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre data-testid="output">{output}</pre>
      </div>

      {tab === "json" && json.note && <p className="note">{json.note}</p>}
      {tab === "markdown" && hasRows && !useHeader && (
        <p className="note">
          Markdown tables need a header row, so this one is blank. Tick “First row is the
          header” if row one really is the header — no column names are invented.
        </p>
      )}

      <footer className="colophon">
        No backend. No accounts. No analytics. Nothing is stored between visits.
        <br />
        Deterministic parsing only — the parser reports what it changed instead of
        guessing.
      </footer>
    </div>
  );
}
