import type { ParsedTable } from "./types";

export type RenderOptions = {
  /** Treat row 0 as the header row. Only ever set from HTML `<th>` evidence or an explicit user choice. */
  useFirstRowAsHeader: boolean;
};

function escapeMarkdownCell(cell: string): string {
  return cell.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

/**
 * Markdown pipe table.
 * Markdown has no way to express a table without a header row, so when there is
 * no header the header cells are left blank rather than filled with invented names.
 */
export function toMarkdown(table: ParsedTable, options: RenderOptions): string {
  if (table.rows.length === 0) return "";

  const width = table.rows[0].length;
  const line = (cells: string[]) => `| ${cells.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${Array(width).fill("---").join(" | ")} |`;

  if (options.useFirstRowAsHeader) {
    const [header, ...body] = table.rows;
    return [line(header), separator, ...body.map(line)].join("\n");
  }

  return [line(Array(width).fill("")), separator, ...table.rows.map(line)].join("\n");
}

function sanitizeTsvCell(cell: string): string {
  return cell.replace(/\t/g, " ").replace(/\r\n?|\n/g, " ");
}

/** Tab-separated rows. Embedded tabs and newlines collapse to a single space. */
export function toTsv(table: ParsedTable): string {
  return table.rows.map((row) => row.map(sanitizeTsvCell).join("\t")).join("\n");
}

export type JsonShape = "arrays" | "objects";

export type JsonResult = {
  text: string;
  /** Set when "objects" was requested but the header could not support it. */
  note?: string;
};

/**
 * JSON. Default is an array of arrays. Objects are only produced when a header
 * row is known and its cells are usable as keys — no property names are invented.
 */
export function toJson(
  table: ParsedTable,
  options: RenderOptions & { shape?: JsonShape },
): JsonResult {
  const shape = options.shape ?? "arrays";

  if (shape === "objects") {
    if (!options.useFirstRowAsHeader || table.rows.length === 0) {
      return {
        text: JSON.stringify(table.rows, null, 2),
        note: "Objects need a header row. Mark the first row as the header first.",
      };
    }
    const [header, ...body] = table.rows;
    const keys = header.map((cell) => cell.trim());
    const blank = keys.some((key) => key === "");
    const duplicate = new Set(keys).size !== keys.length;
    if (blank || duplicate) {
      return {
        text: JSON.stringify(table.rows, null, 2),
        note: blank
          ? "The header row has empty cells, so keys would have to be invented. Showing arrays instead."
          : "The header row has duplicate names, so keys would collide. Showing arrays instead.",
      };
    }
    const objects = body.map((row) =>
      Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ""])),
    );
    return { text: JSON.stringify(objects, null, 2) };
  }

  return { text: JSON.stringify(table.rows, null, 2) };
}
