/**
 * Whitespace normalization for a single cell's text.
 *
 * Rules (deterministic, no content invented):
 *  - CRLF / CR become LF
 *  - non-breaking spaces, zero-width spaces and other exotic spaces become plain spaces
 *  - runs of spaces/tabs collapse to one space
 *  - each line is trimmed
 *  - leading/trailing blank lines are dropped
 *  - internal blank lines collapse to a single line break
 */
export function normalizeCellText(input: string): string {
  const unified = input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00A0\u2007\u202F\u2000-\u200A]/g, " ")
    .replace(/[\u200B\uFEFF]/g, "");

  const lines = unified
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  return lines.filter((line, i) => line !== "" || lines[i - 1] !== "").join("\n");
}

const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "LI",
  "UL",
  "OL",
  "TR",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "SECTION",
  "ARTICLE",
  "PRE",
]);

const DROP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);

/**
 * Turn a cell element into readable plain text.
 * `<br>` and block-level elements become line breaks; everything else is
 * flattened to its text. Entities are decoded by the DOM parser itself.
 */
export function elementToText(el: Element): string {
  const out: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === 3 /* text */) {
      out.push(node.nodeValue ?? "");
      return;
    }
    if (node.nodeType !== 1 /* element */) return;

    const element = node as Element;
    const tag = element.tagName.toUpperCase();
    if (DROP_TAGS.has(tag)) return;

    if (tag === "BR") {
      out.push("\n");
      return;
    }
    if (tag === "IMG") {
      const alt = element.getAttribute("alt");
      if (alt) out.push(alt);
      return;
    }

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) out.push("\n");
    element.childNodes.forEach(walk);
    if (isBlock) out.push("\n");
  };

  el.childNodes.forEach(walk);
  return normalizeCellText(out.join(""));
}

/** Pad every row out to the widest row so the table is rectangular. */
export function rectangularize(rows: string[][]): {
  rows: string[][];
  padded: boolean;
} {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let padded = false;
  const result = rows.map((row) => {
    if (row.length === width) return row.slice();
    padded = true;
    return [...row, ...Array(width - row.length).fill("")];
  });
  return { rows: result, padded };
}
