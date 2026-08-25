import { toTsv, type RenderOptions } from "./render";
import { toHtmlTable } from "./toHtmlTable";
import type { ParsedTable } from "./types";

export type RichPayload = {
  /** A clean semantic `<table>`. */
  html: string;
  /** TSV, so targets that only take plain text still get the grid. */
  text: string;
};

/**
 * The two clipboard flavours for "Copy table", built from the same ParsedTable.
 * Pure (no clipboard access), so the serialization can be tested directly.
 */
export function buildTablePayload(
  table: ParsedTable,
  options: RenderOptions,
): RichPayload {
  return {
    html: toHtmlTable(table, options),
    text: toTsv(table),
  };
}

export type CopyResult = "rich" | "plain" | "failed";

/**
 * Write both flavours to the clipboard, degrading rather than throwing:
 * rich (`text/html` + `text/plain`) → plain text → legacy `execCommand`.
 * Returns what actually happened so the UI can be honest about it.
 */
export async function writeRichClipboard(payload: RichPayload): Promise<CopyResult> {
  const canWriteRich =
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function";

  if (canWriteRich) {
    try {
      const item = new ClipboardItem({
        "text/html": new Blob([payload.html], { type: "text/html" }),
        "text/plain": new Blob([payload.text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return "rich";
    } catch {
      // Firefox before 127, Safari outside a user gesture, permission denied,
      // or a browser that rejects the text/html flavour. Fall through to text.
    }
  }

  return (await writePlainClipboard(payload.text)) ? "plain" : "failed";
}

/** Plain-text write with the legacy fallback. Used on its own by the non-table tabs. */
export async function writePlainClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and non-secure contexts.
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  } catch {
    return false;
  }
}
