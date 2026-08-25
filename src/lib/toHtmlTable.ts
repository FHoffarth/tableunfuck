import type { RenderOptions } from "./render";
import type { ParsedTable } from "./types";

/**
 * Escape text for insertion into HTML. Applied to every cell, so pasted content
 * can never become markup in the clipboard payload or in a paste target.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cellHtml(cell: string): string {
  // Cell text is escaped first; only our own <br> survives as markup.
  return escapeHtml(cell).replace(/\r\n?|\n/g, "<br>");
}

// Inline styles, because rich-text targets (Word, Outlook, Gmail) drop
// stylesheets and keep only what is on the element itself. Deliberately plain:
// a border, some padding, a bold header. Nothing decorative.
const TABLE_STYLE = "border-collapse:collapse;";
const CELL_STYLE = "border:1px solid #999999;padding:4px 8px;text-align:left;";
const HEADER_STYLE = `${CELL_STYLE}font-weight:bold;background-color:#f2f2f2;`;

/**
 * A clean semantic `<table>` for the clipboard.
 *
 * Structure mirrors `ParsedTable.rows` exactly: same row count, same cell
 * count, same order, same values. No cell is merged back together, no column
 * name is invented, and a `<thead>` is only emitted when the caller says row 0
 * really is the header.
 */
export function toHtmlTable(table: ParsedTable, options: RenderOptions): string {
  if (table.rows.length === 0) return "";

  const row = (cells: string[], tag: "td" | "th") => {
    const style = tag === "th" ? HEADER_STYLE : CELL_STYLE;
    const inner = cells
      .map((cell) => `<${tag} style="${style}">${cellHtml(cell)}</${tag}>`)
      .join("");
    return `<tr>${inner}</tr>`;
  };

  if (options.useFirstRowAsHeader) {
    const [header, ...body] = table.rows;
    const head = `<thead>${row(header, "th")}</thead>`;
    const rest = body.length
      ? `<tbody>${body.map((cells) => row(cells, "td")).join("")}</tbody>`
      : "";
    return `<table style="${TABLE_STYLE}">${head}${rest}</table>`;
  }

  const body = table.rows.map((cells) => row(cells, "td")).join("");
  return `<table style="${TABLE_STYLE}"><tbody>${body}</tbody></table>`;
}
