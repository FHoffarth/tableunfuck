import { describe, expect, it } from "vitest";
import { parseHtmlTable } from "../parseHtml";

describe("parseHtmlTable", () => {
  it("parses a clean HTML table", () => {
    const table = parseHtmlTable(`
      <table>
        <tr><td>Name</td><td>Role</td></tr>
        <tr><td>Ada</td><td>Engineer</td></tr>
      </table>
    `);
    expect(table?.rows).toEqual([
      ["Name", "Role"],
      ["Ada", "Engineer"],
    ]);
    expect(table?.source).toBe("html");
    expect(table?.hasHeaderEvidence).toBe(false);
    expect(table?.warnings).toEqual([]);
  });

  it("flattens nested inline markup to readable text", () => {
    const table = parseHtmlTable(`
      <table><tr>
        <td><span style="color:red"><b>Ada</b> <i>Lovelace</i></span></td>
        <td><span>  spaced   out  </span></td>
      </tr></table>
    `);
    expect(table?.rows).toEqual([["Ada Lovelace", "spaced out"]]);
  });

  it("turns <br> inside a cell into a line break", () => {
    const table = parseHtmlTable(
      `<table><tr><td>line one<br>line two</td><td>x</td></tr></table>`,
    );
    expect(table?.rows[0][0]).toBe("line one\nline two");
  });

  it("records header evidence from <th> cells", () => {
    const table = parseHtmlTable(`
      <table>
        <thead><tr><th>Name</th><th>Role</th></tr></thead>
        <tbody><tr><td>Ada</td><td>Engineer</td></tr></tbody>
      </table>
    `);
    expect(table?.hasHeaderEvidence).toBe(true);
    expect(table?.rows[0]).toEqual(["Name", "Role"]);
  });

  it("keeps empty cells empty instead of dropping them", () => {
    const table = parseHtmlTable(
      `<table><tr><td>a</td><td></td><td>c</td></tr></table>`,
    );
    expect(table?.rows).toEqual([["a", "", "c"]]);
  });

  it("decodes entities and normalizes non-breaking spaces", () => {
    const table = parseHtmlTable(
      `<table><tr><td>Tom&nbsp;&amp;&nbsp;Jerry</td><td>&lt;b&gt;</td></tr></table>`,
    );
    expect(table?.rows).toEqual([["Tom & Jerry", "<b>"]]);
  });

  it("warns when merged cells are flattened and does not duplicate text", () => {
    const table = parseHtmlTable(`
      <table>
        <tr><td colspan="2">Q1</td><td>Q2</td></tr>
        <tr><td>a</td><td>b</td><td>c</td></tr>
      </table>
    `);
    expect(table?.rows).toEqual([
      ["Q1", "", "Q2"],
      ["a", "b", "c"],
    ]);
    expect(table?.warnings.join(" ")).toMatch(/merged cells/i);
  });

  it("expands rowspan into the rows below", () => {
    const table = parseHtmlTable(`
      <table>
        <tr><td rowspan="2">EU</td><td>Berlin</td></tr>
        <tr><td>Paris</td></tr>
      </table>
    `);
    expect(table?.rows).toEqual([
      ["EU", "Berlin"],
      ["", "Paris"],
    ]);
    expect(table?.warnings.join(" ")).toMatch(/merged cells/i);
  });

  it("warns about unusable span values", () => {
    const table = parseHtmlTable(
      `<table><tr><td colspan="0">a</td><td>b</td></tr></table>`,
    );
    expect(table?.rows).toEqual([["a", "b"]]);
    expect(table?.warnings.join(" ")).toMatch(/single cell/i);
  });

  it("pads ragged rows and says so", () => {
    const table = parseHtmlTable(`
      <table>
        <tr><td>a</td><td>b</td><td>c</td></tr>
        <tr><td>d</td></tr>
      </table>
    `);
    expect(table?.rows).toEqual([
      ["a", "b", "c"],
      ["d", "", ""],
    ]);
    expect(table?.warnings.join(" ")).toMatch(/padded/i);
  });

  it("picks the data table out of email layout wrappers", () => {
    const table = parseHtmlTable(`
      <table><tr><td>
        <table>
          <tr><td>Item</td><td>Qty</td></tr>
          <tr><td>Bolt</td><td>12</td></tr>
        </table>
      </td></tr></table>
    `);
    expect(table?.rows).toEqual([
      ["Item", "Qty"],
      ["Bolt", "12"],
    ]);
  });

  it("returns null when there is no table at all", () => {
    expect(parseHtmlTable("<p>just a paragraph</p>")).toBeNull();
  });
});
