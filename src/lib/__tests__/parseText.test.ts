import { describe, expect, it } from "vitest";
import { parsePlainText } from "../parseText";

describe("parsePlainText", () => {
  it("parses TSV input", () => {
    const table = parsePlainText("Name\tRole\nAda\tEngineer");
    expect(table.source).toBe("tsv");
    expect(table.rows).toEqual([
      ["Name", "Role"],
      ["Ada", "Engineer"],
    ]);
    expect(table.warnings).toEqual([]);
  });

  it("pads uneven TSV rows and warns", () => {
    const table = parsePlainText("a\tb\tc\nd\te");
    expect(table.rows).toEqual([
      ["a", "b", "c"],
      ["d", "e", ""],
    ]);
    expect(table.warnings.join(" ")).toMatch(/padded/i);
  });

  it("keeps empty TSV cells", () => {
    const table = parsePlainText("a\t\tc");
    expect(table.rows).toEqual([["a", "", "c"]]);
  });

  it("does not split ordinary prose into fake columns", () => {
    const prose = [
      "This is a normal sentence about tables.",
      "It continues onto a second line here.",
      "And a third one, for good measure.",
    ].join("\n");
    const table = parsePlainText(prose);
    expect(table.source).toBe("text");
    expect(table.confidence).toBe("low");
    expect(table.rows.every((row) => row.length === 1)).toBe(true);
    expect(table.warnings.join(" ")).toMatch(/each line became a single-cell row/i);
  });

  it("splits space-aligned columns only when every line agrees", () => {
    const table = parsePlainText(
      ["Ada     Engineer   Berlin", "Grace   Admiral    Boston"].join("\n"),
    );
    expect(table.source).toBe("text");
    expect(table.confidence).toBe("medium");
    expect(table.rows).toEqual([
      ["Ada", "Engineer", "Berlin"],
      ["Grace", "Admiral", "Boston"],
    ]);
  });

  it("falls back to lines when the column count is inconsistent", () => {
    const table = parsePlainText(
      ["Ada     Engineer   Berlin", "Grace   Admiral"].join("\n"),
    );
    expect(table.confidence).toBe("low");
    expect(table.rows).toEqual([
      ["Ada Engineer Berlin"],
      ["Grace Admiral"],
    ]);
  });

  it("reports empty input instead of inventing rows", () => {
    const table = parsePlainText("   \n\n  ");
    expect(table.rows).toEqual([]);
    expect(table.warnings).toEqual(["Nothing to parse."]);
  });
});
