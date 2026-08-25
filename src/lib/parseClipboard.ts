import { parseHtmlTable } from "./parseHtml";
import { parsePlainText } from "./parseText";
import type { ParsedTable } from "./types";

export type ClipboardPayload = {
  html?: string | null;
  text?: string | null;
};

/**
 * Decide what to parse from the clipboard.
 * `text/html` wins when it actually contains a table; otherwise `text/plain`.
 */
export function parseClipboard(payload: ClipboardPayload): ParsedTable {
  const html = payload.html?.trim();
  const text = payload.text ?? "";

  if (html) {
    const parsed = parseHtmlTable(html);
    if (parsed && parsed.rows.length > 0) return parsed;

    if (text.trim() === "") {
      return {
        rows: [],
        source: "html",
        warnings: [
          "The clipboard held HTML but no <table> element, and there was no plain-text version to fall back to.",
        ],
        hasHeaderEvidence: false,
        confidence: "low",
      };
    }

    const fallback = parsePlainText(text);
    return {
      ...fallback,
      warnings: [
        "The clipboard held HTML but no <table> element. Parsed the plain-text version instead.",
        ...fallback.warnings,
      ],
    };
  }

  return parsePlainText(text);
}

export function readClipboardEvent(event: ClipboardEvent): ClipboardPayload {
  const data = event.clipboardData;
  if (!data) return {};
  return {
    html: data.getData("text/html") || null,
    text: data.getData("text/plain") || null,
  };
}

/** Which clipboard flavours the browser handed us — shown in the UI as a badge. */
export function describeAvailableFlavours(payload: ClipboardPayload): string[] {
  const flavours: string[] = [];
  if (payload.html?.trim()) flavours.push("text/html");
  if (payload.text?.trim()) flavours.push("text/plain");
  return flavours;
}
