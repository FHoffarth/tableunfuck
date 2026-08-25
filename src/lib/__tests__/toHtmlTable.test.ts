import { describe, expect, it } from "vitest";
import { escapeHtml, toHtmlTable } from "../toHtmlTable";
import type { ParsedTable } from "../types";

function makeTable(rows: string[][], overrides: Partial<ParsedTable> = {}): ParsedTable {
  return {
    rows,
    source: "tsv",
    warnings: [],
    hasHeaderEvidence: false,
    confidence: "high",
    ...overrides,
  };
}

const GRID = [
  ["Name", "Role"],
  ["Ada", "Engineer"],
  ["Grace", "Architect"],
];

/** Read the serialized HTML back out as a plain grid, via the DOM. */
function readBack(html: string): { rows: string[][]; headerCells: string[] } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("th,td")).map((cell) => cell.textContent ?? ""),
  );
  const headerCells = Array.from(doc.querySelectorAll("th")).map(
    (th) => th.textContent ?? "",
  );
  return { rows, headerCells };
}

describe("toHtmlTable", () => {
  it("renders exactly the rows and columns of the ParsedTable", () => {
    const html = toHtmlTable(makeTable(GRID), { useFirstRowAsHeader: false });
    const { rows } = readBack(html);

    expect(rows).toEqual(GRID);
    expect(rows).toHaveLength(3);
    rows.forEach((row) => expect(row).toHaveLength(2));
  });

  it("emits a thead only when the first row is explicitly the header", () => {
    const withHeader = toHtmlTable(makeTable(GRID), { useFirstRowAsHeader: true });
    expect(withHeader).toContain("<thead>");
    expect(readBack(withHeader).headerCells).toEqual(["Name", "Role"]);
    // The header row is not duplicated into the body.
    expect(readBack(withHeader).rows).toEqual(GRID);

    const withoutHeader = toHtmlTable(makeTable(GRID), { useFirstRowAsHeader: false });
    expect(withoutHeader).not.toContain("<thead>");
    expect(withoutHeader).not.toContain("<th");
  });

  it("invents no column names when there is no header", () => {
    const html = toHtmlTable(makeTable(GRID), { useFirstRowAsHeader: false });
    const { rows, headerCells } = readBack(html);

    expect(headerCells).toEqual([]);
    // Every string in the output came from the input.
    const inputCells = new Set(GRID.flat());
    rows.flat().forEach((cell) => expect(inputCells.has(cell)).toBe(true));
    expect(html).not.toMatch(/Column\s*\d/i);
  });

  it("keeps flattened merged cells empty rather than refilling them", () => {
    // Shape produced by the parser for a rowspan: origin keeps the text.
    const flattened = [
      ["Widget", "3"],
      ["", "7"],
    ];
    const html = toHtmlTable(makeTable(flattened), { useFirstRowAsHeader: false });

    expect(readBack(html).rows).toEqual(flattened);
    expect(html).not.toContain("rowspan");
    expect(html).not.toContain("colspan");
  });

  it("escapes unsafe cell content instead of emitting markup", () => {
    const nasty = [
      ["<script>alert(1)</script>", 'a & b "quoted"'],
      ["<img src=x onerror=alert(1)>", "it's fine"],
    ];
    const html = toHtmlTable(makeTable(nasty), { useFirstRowAsHeader: false });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;");

    // And it round-trips back to the original text through the DOM.
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll("script")).toHaveLength(0);
    expect(doc.querySelectorAll("img")).toHaveLength(0);
    expect(readBack(html).rows).toEqual(nasty);
  });

  it("turns newlines inside a cell into <br>, and nothing else", () => {
    const html = toHtmlTable(makeTable([["Gadget\ndeluxe", "1"]]), {
      useFirstRowAsHeader: false,
    });
    expect(html).toContain("Gadget<br>deluxe");
  });

  it("returns an empty string for an empty table", () => {
    expect(toHtmlTable(makeTable([]), { useFirstRowAsHeader: false })).toBe("");
    expect(toHtmlTable(makeTable([]), { useFirstRowAsHeader: true })).toBe("");
  });

  it("escapes the five characters that matter", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});
