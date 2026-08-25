import { elementToText, rectangularize } from "./normalize";
import type { ParsedTable } from "./types";

const MAX_SPAN = 1000;

function ownDescendants(table: Element, selector: string): Element[] {
  return Array.from(table.querySelectorAll(selector)).filter(
    (el) => el.closest("table") === table,
  );
}

function ownCells(row: Element): Element[] {
  return Array.from(row.querySelectorAll("th, td")).filter(
    (cell) => cell.closest("tr") === row,
  );
}

/** Pick the table that actually holds data, not the layout wrappers around it. */
function pickDataTable(doc: Document): { table: Element; total: number } | null {
  const tables = Array.from(doc.querySelectorAll("table"));
  let best: { table: Element; total: number } | null = null;

  for (const table of tables) {
    const rows = ownDescendants(table, "tr");
    const cellCount = rows.reduce((sum, row) => sum + ownCells(row).length, 0);
    const multiCellRows = rows.filter((row) => ownCells(row).length >= 2).length;
    const score = multiCellRows * 1000 + cellCount;
    if (score > 0 && (!best || score > best.total)) {
      best = { table, total: score };
    }
  }
  return best;
}

function readSpan(cell: Element, attr: "rowspan" | "colspan"): number {
  const raw = cell.getAttribute(attr);
  if (raw == null) return 1;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return 0; // 0 / invalid: caller warns
  return Math.min(value, MAX_SPAN);
}

/**
 * Parse the first meaningful `<table>` out of an HTML fragment.
 * Returns `null` when the fragment contains no table at all, so the caller
 * can fall back to plain-text parsing.
 */
export function parseHtmlTable(html: string): ParsedTable | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const picked = pickDataTable(doc);
  if (!picked) return null;

  const table = picked.table;
  const warnings: string[] = [];

  const tableCount = doc.querySelectorAll("table").length;
  const dataTableCount = Array.from(doc.querySelectorAll("table")).filter(
    (t) => ownDescendants(t, "tr").some((row) => ownCells(row).length >= 2),
  ).length;
  if (dataTableCount > 1) {
    warnings.push(
      `The clipboard held ${dataTableCount} tables. Only the largest one was parsed.`,
    );
  } else if (tableCount > 1) {
    warnings.push(
      "The clipboard held nested layout tables. The innermost data table was parsed.",
    );
  }

  const trs = ownDescendants(table, "tr");
  const grid: (string | null)[][] = [];
  let sawSpan = false;
  let sawBadSpan = false;

  const ensure = (r: number, c: number) => {
    while (grid.length <= r) grid.push([]);
    const row = grid[r];
    while (row.length <= c) row.push(null);
  };

  trs.forEach((tr, rowIndex) => {
    ensure(rowIndex, 0);
    let col = 0;
    for (const cell of ownCells(tr)) {
      while (grid[rowIndex][col] != null) col += 1;

      let rowSpan = readSpan(cell, "rowspan");
      let colSpan = readSpan(cell, "colspan");
      if (rowSpan === 0 || colSpan === 0) {
        sawBadSpan = true;
        rowSpan = rowSpan || 1;
        colSpan = colSpan || 1;
      }
      if (rowSpan > 1 || colSpan > 1) sawSpan = true;

      const text = elementToText(cell);
      for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
        for (let c = col; c < col + colSpan; c += 1) {
          ensure(r, c);
          // Only the origin cell keeps the text. Spanned cells stay empty
          // rather than duplicating content that was never there.
          if (grid[r][c] == null) grid[r][c] = r === rowIndex && c === col ? text : "";
        }
      }
      col += colSpan;
    }
  });

  if (sawSpan) {
    warnings.push(
      "Merged cells (rowspan/colspan) were flattened to a plain grid. The text stays in the top-left cell of each merge; the cells it covered are empty.",
    );
  }
  if (sawBadSpan) {
    warnings.push(
      "A cell used rowspan=\"0\", colspan=\"0\" or an unreadable span value. It was treated as spanning a single cell.",
    );
  }

  const raw = grid.map((row) => row.map((cell) => cell ?? ""));
  const { rows, padded } = rectangularize(raw);

  if (padded) {
    warnings.push(
      "Rows had different cell counts. Short rows were padded with empty cells.",
    );
  }

  const nonEmpty = rows.filter((row) => row.some((cell) => cell !== ""));
  if (nonEmpty.length !== rows.length) {
    warnings.push("Some rows were completely empty. They were kept as-is.");
  }

  const firstRow = trs[0];
  const headerFromTh =
    !!firstRow && ownCells(firstRow).length > 0 &&
    ownCells(firstRow).every((cell) => cell.tagName.toUpperCase() === "TH");
  const headerFromThead =
    ownDescendants(table, "thead tr").length > 0 &&
    ownDescendants(table, "thead tr")[0] === firstRow;

  return {
    rows,
    source: "html",
    warnings,
    hasHeaderEvidence: headerFromTh || headerFromThead,
    confidence: "high",
  };
}
