import { normalizeCellText, rectangularize } from "./normalize";
import type { ParsedTable } from "./types";

const MAX_ALIGNED_FIELD_LENGTH = 60;

function toLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function trimBlankEdges(lines: string[]): string[] {
  const copy = lines.slice();
  while (copy.length && copy[0].trim() === "") copy.shift();
  while (copy.length && copy[copy.length - 1].trim() === "") copy.pop();
  return copy;
}

function parseTabSeparated(lines: string[]): ParsedTable | null {
  if (!lines.some((line) => line.includes("\t"))) return null;

  const raw = lines.map((line) => line.split("\t").map(normalizeCellText));
  const { rows, padded } = rectangularize(raw);
  const warnings: string[] = [];
  if (padded) {
    warnings.push(
      "Rows had different cell counts. Short rows were padded with empty cells.",
    );
  }
  if (!lines.every((line) => line.includes("\t") || line.trim() === "")) {
    warnings.push(
      "Some lines contained no tabs. They became single-cell rows before padding.",
    );
  }

  return {
    rows,
    source: "tsv",
    warnings,
    hasHeaderEvidence: false,
    confidence: "high",
  };
}

/**
 * Split on runs of two or more spaces — but only when the evidence is strong:
 * every non-empty line must produce the same number of fields, there must be
 * at least two fields and two rows, and no field may be long enough to look
 * like prose. Ordinary sentences use single spaces, so they never reach here.
 */
function parseAlignedColumns(lines: string[]): ParsedTable | null {
  const content = lines.filter((line) => line.trim() !== "");
  if (content.length < 2) return null;

  const split = content.map((line) =>
    line.trim().split(/[ \t]{2,}/).map(normalizeCellText),
  );

  const width = split[0].length;
  if (width < 2) return null;
  if (!split.every((row) => row.length === width)) return null;
  if (split.some((row) => row.some((cell) => cell.length > MAX_ALIGNED_FIELD_LENGTH))) {
    return null;
  }
  if (split.some((row) => row.some((cell) => cell === ""))) return null;

  return {
    rows: split,
    source: "text",
    warnings: [
      "No tabs found. Columns were split on runs of two or more spaces — check the preview before trusting it.",
    ],
    hasHeaderEvidence: false,
    confidence: "medium",
  };
}

function parseLinesOnly(lines: string[]): ParsedTable {
  const rows = lines
    .map((line) => [normalizeCellText(line)])
    .filter((row) => row[0] !== "");

  return {
    rows,
    source: "text",
    warnings: [
      "No column structure was detected, so each line became a single-cell row. Columns were not guessed.",
    ],
    hasHeaderEvidence: false,
    confidence: "low",
  };
}

/** Plain-text fallback. Tries tabs, then aligned columns, then one line per row. */
export function parsePlainText(text: string): ParsedTable {
  const lines = trimBlankEdges(toLines(text));

  if (lines.length === 0) {
    return {
      rows: [],
      source: "text",
      warnings: ["Nothing to parse."],
      hasHeaderEvidence: false,
      confidence: "low",
    };
  }

  return parseTabSeparated(lines) ?? parseAlignedColumns(lines) ?? parseLinesOnly(lines);
}
