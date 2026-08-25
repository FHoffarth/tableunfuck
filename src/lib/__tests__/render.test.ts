import { describe, expect, it } from "vitest";
import { toJson, toMarkdown, toTsv } from "../render";
import { parseClipboard } from "../parseClipboard";
import type { ParsedTable } from "../types";

const table = (rows: string[][]): ParsedTable => ({
  rows,
  source: "html",
  warnings: [],
  hasHeaderEvidence: false,
  confidence: "high",
});

describe("toMarkdown", () => {
  it("escapes pipes inside cells", () => {
    const md = toMarkdown(table([["a|b", "c"]]), { useFirstRowAsHeader: false });
    expect(md).toContain("a\\|b");
    expect(md.split("\n")).toHaveLength(3);
  });

  it("uses the first row as the header when asked", () => {
    const md = toMarkdown(
      table([
        ["Name", "Role"],
        ["Ada", "Engineer"],
      ]),
      { useFirstRowAsHeader: true },
    );
    expect(md).toBe(
      ["| Name | Role |", "| --- | --- |", "| Ada | Engineer |"].join("\n"),
    );
  });

  it("leaves the header blank rather than inventing column names", () => {
    const md = toMarkdown(table([["Ada", "Engineer"]]), {
      useFirstRowAsHeader: false,
    });
    expect(md.split("\n")[0]).toBe("|  |  |");
    expect(md).not.toMatch(/Column/i);
  });

  it("keeps multi-line cells on one Markdown row", () => {
    const md = toMarkdown(table([["one\ntwo", "x"]]), {
      useFirstRowAsHeader: false,
    });
    expect(md).toContain("one<br>two");
  });
});

describe("toTsv", () => {
  it("sanitizes embedded tabs and newlines", () => {
    expect(toTsv(table([["a\tb", "c\nd"]]))).toBe("a b\tc d");
  });

  it("preserves row structure and empty cells", () => {
    expect(toTsv(table([["a", ""], ["", "d"]]))).toBe("a\t\n\td");
  });
});

describe("toJson", () => {
  it("defaults to an array of arrays", () => {
    const { text } = toJson(table([["a", "b"]]), { useFirstRowAsHeader: false });
    expect(JSON.parse(text)).toEqual([["a", "b"]]);
  });

  it("builds objects from a known header row", () => {
    const { text, note } = toJson(
      table([
        ["Name", "Role"],
        ["Ada", "Engineer"],
      ]),
      { useFirstRowAsHeader: true, shape: "objects" },
    );
    expect(note).toBeUndefined();
    expect(JSON.parse(text)).toEqual([{ Name: "Ada", Role: "Engineer" }]);
  });

  it("refuses to invent property names for blank headers", () => {
    const { text, note } = toJson(
      table([
        ["Name", ""],
        ["Ada", "Engineer"],
      ]),
      { useFirstRowAsHeader: true, shape: "objects" },
    );
    expect(note).toMatch(/invented/i);
    expect(JSON.parse(text)).toEqual([
      ["Name", ""],
      ["Ada", "Engineer"],
    ]);
  });
});

describe("parseClipboard", () => {
  it("prefers text/html over text/plain", () => {
    const result = parseClipboard({
      html: "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>",
      text: "A B\n1 2",
    });
    expect(result.source).toBe("html");
    expect(result.hasHeaderEvidence).toBe(true);
  });

  it("falls back to plain text when the HTML holds no table", () => {
    const result = parseClipboard({
      html: "<div><p>hello</p></div>",
      text: "a\tb",
    });
    expect(result.source).toBe("tsv");
    expect(result.warnings.join(" ")).toMatch(/no <table> element/i);
  });

  it("uses plain text when no HTML flavour exists", () => {
    const result = parseClipboard({ html: null, text: "a\tb" });
    expect(result.rows).toEqual([["a", "b"]]);
  });
});
