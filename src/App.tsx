import { useEffect, useMemo, useRef, useState } from "react";
import {
  describeAvailableFlavours,
  parseClipboard,
  readClipboardEvent,
  type ClipboardPayload,
} from "./lib/parseClipboard";
import { parsePlainText } from "./lib/parseText";
import { toJson, toMarkdown, toTsv, type JsonShape } from "./lib/render";
import {
  buildTablePayload,
  writePlainClipboard,
  writeRichClipboard,
} from "./lib/clipboard";
import type { ParsedTable } from "./lib/types";
import { DEFAULT_LANG, LANGS, STRINGS, type Lang, type StringKey } from "./i18n";

type OutputTab = "table" | "markdown" | "tsv" | "json";

const TABS: { id: OutputTab; label: StringKey; help: StringKey }[] = [
  { id: "table", label: "tabTable", help: "helpTable" },
  { id: "markdown", label: "tabMarkdown", help: "helpMarkdown" },
  { id: "tsv", label: "tabTsv", help: "helpTsv" },
  { id: "json", label: "tabJson", help: "helpJson" },
];

const SOURCE_KEY: Record<ParsedTable["source"], StringKey> = {
  html: "sourceHtml",
  tsv: "sourceTsv",
  text: "sourceText",
};

type CopyState = "idle" | "rich" | "plain" | "failed";

export default function App() {
  const [raw, setRaw] = useState("");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [flavours, setFlavours] = useState<string[]>([]);
  const [tab, setTab] = useState<OutputTab>("table");
  const [jsonShape, setJsonShape] = useState<JsonShape>("arrays");
  const [useHeader, setUseHeader] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Language only selects strings. It never touches raw, table or any option,
  // so switching cannot reparse, reset input, or change output.
  const t = (key: StringKey) => STRINGS[lang][key];

  const ingest = (payload: ClipboardPayload) => {
    const parsed = parseClipboard(payload);
    setTable(parsed);
    setFlavours(describeAvailableFlavours(payload));
    setUseHeader(parsed.hasHeaderEvidence);
    setCopyState("idle");
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
    setCopyState("idle");
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
    setCopyState("idle");
    textareaRef.current?.focus();
  };

  const json = useMemo(
    () =>
      table
        ? toJson(table, { useFirstRowAsHeader: useHeader, shape: jsonShape })
        : { text: "" },
    [table, useHeader, jsonShape],
  );

  const hasRows = !!table && table.rows.length > 0;
  const columns = hasRows ? table.rows[0].length : 0;

  /** Text output for the three text tabs. Empty in Table mode, which renders DOM. */
  const output = useMemo(() => {
    if (!table || table.rows.length === 0) return "";
    if (tab === "markdown") return toMarkdown(table, { useFirstRowAsHeader: useHeader });
    if (tab === "tsv") return toTsv(table);
    if (tab === "json") return json.text;
    return "";
  }, [table, tab, useHeader, json]);

  const canCopy = tab === "table" ? hasRows : output !== "";

  const flash = (state: CopyState) => {
    setCopyState(state);
    window.setTimeout(() => setCopyState("idle"), 1600);
  };

  const copy = async () => {
    if (!canCopy) return;
    if (tab === "table" && table) {
      const payload = buildTablePayload(table, { useFirstRowAsHeader: useHeader });
      flash(await writeRichClipboard(payload));
      return;
    }
    flash((await writePlainClipboard(output)) ? "rich" : "failed");
  };

  const copyLabel = () => {
    if (copyState === "rich") return t("copied");
    if (copyState === "plain") return t("copiedPlain");
    if (copyState === "failed") return t("copyFailed");
    return tab === "table" ? t("copyTable") : t("copy");
  };

  const headerRow = hasRows && useHeader ? table.rows[0] : null;
  const bodyRows = !hasRows ? [] : useHeader ? table.rows.slice(1) : table.rows;

  return (
    <div className="shell">
      <header className="masthead">
        <h1 className="wordmark">
          Table<span>Unfuck</span>
        </h1>
        <div className="masthead-right">
          <div className="langswitch" role="group" aria-label="Language">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={`lang${lang === code ? " is-active" : ""}`}
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="trust">{t("trust")}</p>
        </div>
      </header>

      <section className="intro">
        <h2 className="intro-headline">{t("introHeadline")}</h2>
        <p className="intro-body">{t("introBody")}</p>
        <p className="intro-privacy">{t("introPrivacy")}</p>
      </section>

      <h2 className="section-label">
        <span className="step">1</span>
        {t("paste")}
      </h2>
      <div className={`dropzone${raw ? " is-loaded" : ""}`}>
        <label className="sr-only" htmlFor="paste-input">
          {t("pasteLabel")}
        </label>
        <textarea
          id="paste-input"
          ref={textareaRef}
          value={raw}
          spellCheck={false}
          onChange={(event) => onEdit(event.target.value)}
          placeholder={t("placeholder")}
        />
        {!raw && <span className="zone-hint">⌘V / Ctrl+V</span>}
      </div>

      <div className="toolbar">
        {table && (
          <span className="detected">
            <span className="detected-label">{t("readAs")}</span>
            <strong>{t(SOURCE_KEY[table.source])}</strong>
          </span>
        )}
        {table && table.confidence !== "high" && (
          <span className="badge is-low">
            {table.confidence === "medium" ? t("confidenceMedium") : t("confidenceLow")}
          </span>
        )}
        <span className="spacer" />
        {flavours.length > 0 && (
          <span className="flavours">
            {t("flavoursLabel")}{" "}
            {flavours.map((flavour) => (
              <code key={flavour}>{flavour}</code>
            ))}
          </span>
        )}
        {(raw || table) && (
          <button type="button" className="linkish" onClick={clear}>
            {t("clear")}
          </button>
        )}
      </div>

      <div aria-live="polite">
        {table && table.warnings.length > 0 && (
          <section className="warnings">
            <h2>{t("warningsTitle")}</h2>
            <ul>
              {table.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            {lang !== "en" && (
              <p className="warnings-lang">{t("warningsEnglishOnly")}</p>
            )}
          </section>
        )}
      </div>

      <h2 className="section-label">
        <span className="step">2</span>
        {t("preview")}
      </h2>
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
                        {cell === "" ? <span className="cell-empty">-</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">{t("emptyState")}</p>
          )}
        </div>
        <div className="sprockets is-right" aria-hidden="true" />
      </div>
      {hasRows && (
        <p className="rowcount">
          {table.rows.length} {t(table.rows.length === 1 ? "row" : "rows")} × {columns}{" "}
          {t(columns === 1 ? "column" : "columns")}
        </p>
      )}

      <h2 className="section-label">
        <span className="step">3</span>
        {t("output")}
      </h2>
      <div className="tabs" role="tablist" aria-label={t("outputFormat")}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="output-panel"
            className={`tab${id === "table" ? " is-primary" : ""}`}
            onClick={() => setTab(id)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <p className="tab-help" data-testid="tab-help">
        {t(TABS.find((entry) => entry.id === tab)!.help)}
      </p>

      <div
        className="output"
        id="output-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        <div className="output-bar">
          <label className={`option${hasRows ? "" : " is-disabled"}`}>
            <input
              type="checkbox"
              checked={useHeader}
              disabled={!hasRows}
              onChange={(event) => setUseHeader(event.target.checked)}
            />
            {t("firstRowHeader")}
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
              {t("arrayOfObjects")}
            </label>
          )}

          <span className="spacer" />
          <button type="button" className="copy" onClick={copy} disabled={!canCopy}>
            {copyLabel()}
          </button>
        </div>

        {tab === "table" ? (
          <div className="clean-table" data-testid="output-table">
            {hasRows && (
              <table>
                {headerRow && (
                  <thead>
                    <tr>
                      {headerRow.map((cell, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <th key={i}>{cell}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {bodyRows.map((row, rowIndex) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <pre data-testid="output">{output}</pre>
        )}
      </div>

      {tab === "table" && hasRows && <p className="note">{t("richCopyNote")}</p>}
      {tab === "table" && hasRows && !useHeader && (
        <p className="note">{t("tableNoHeader")}</p>
      )}
      {tab === "json" && json.note && <p className="note">{json.note}</p>}
      {tab === "markdown" && hasRows && !useHeader && (
        <p className="note">{t("markdownNoHeader")}</p>
      )}

      <footer className="colophon">
        {t("footerA")}
        <br />
        {t("footerB")}
      </footer>
    </div>
  );
}
