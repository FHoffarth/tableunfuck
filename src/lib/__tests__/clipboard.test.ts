import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTablePayload, writeRichClipboard } from "../clipboard";
import { toTsv } from "../render";
import type { ParsedTable } from "../types";

const TABLE: ParsedTable = {
  rows: [
    ["Name", "Role"],
    ["Ada", "Engineer"],
  ],
  source: "tsv",
  warnings: [],
  hasHeaderEvidence: false,
  confidence: "high",
};

/** jsdom's Blob has no .text(), so read it the long way. */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

type ItemInit = Record<string, Blob>;

/** Stand-in for the browser ClipboardItem, so the payload can be inspected. */
class FakeClipboardItem {
  constructor(public readonly items: ItemInit) {}
}

function installClipboard(options: {
  rich?: boolean;
  writeRejects?: boolean;
  writeTextRejects?: boolean;
}) {
  const write = vi.fn(() =>
    options.writeRejects ? Promise.reject(new Error("nope")) : Promise.resolve(),
  );
  const writeText = vi.fn(() =>
    options.writeTextRejects ? Promise.reject(new Error("nope")) : Promise.resolve(),
  );

  if (options.rich) {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    Object.assign(navigator, { clipboard: { write, writeText } });
  } else {
    vi.stubGlobal("ClipboardItem", undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  }

  return { write, writeText };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildTablePayload", () => {
  it("carries an HTML table and a TSV plain-text twin", () => {
    const payload = buildTablePayload(TABLE, { useFirstRowAsHeader: true });

    expect(payload.html).toContain("<table");
    expect(payload.html).toContain("<th");
    expect(payload.text).toBe("Name\tRole\nAda\tEngineer");
    expect(payload.text).toBe(toTsv(TABLE));
  });

  it("still produces TSV when the table has no header", () => {
    const payload = buildTablePayload(TABLE, { useFirstRowAsHeader: false });
    expect(payload.html).not.toContain("<th");
    expect(payload.text).toBe(toTsv(TABLE));
  });
});

describe("writeRichClipboard", () => {
  it("writes both text/html and text/plain when the browser supports it", async () => {
    const { write, writeText } = installClipboard({ rich: true });
    const payload = buildTablePayload(TABLE, { useFirstRowAsHeader: true });

    const result = await writeRichClipboard(payload);

    expect(result).toBe("rich");
    expect(writeText).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);

    const [items] = write.mock.calls[0] as unknown as [FakeClipboardItem[]];
    const flavours = items[0].items;
    expect(Object.keys(flavours).sort()).toEqual(["text/html", "text/plain"]);
    expect(flavours["text/html"].type).toBe("text/html");
    expect(flavours["text/plain"].type).toBe("text/plain");
    await expect(readBlob(flavours["text/html"])).resolves.toBe(payload.html);
    await expect(readBlob(flavours["text/plain"])).resolves.toBe(payload.text);
  });

  it("falls back to plain TSV when ClipboardItem is unavailable", async () => {
    const { writeText } = installClipboard({ rich: false });
    const payload = buildTablePayload(TABLE, { useFirstRowAsHeader: true });

    const result = await writeRichClipboard(payload);

    expect(result).toBe("plain");
    expect(writeText).toHaveBeenCalledWith(payload.text);
  });

  it("falls back to plain TSV when the rich write is rejected", async () => {
    const { write, writeText } = installClipboard({ rich: true, writeRejects: true });
    const payload = buildTablePayload(TABLE, { useFirstRowAsHeader: true });

    const result = await writeRichClipboard(payload);

    expect(write).toHaveBeenCalled();
    expect(result).toBe("plain");
    expect(writeText).toHaveBeenCalledWith(payload.text);
  });

  it("reports failure rather than throwing when nothing works", async () => {
    installClipboard({ rich: false, writeTextRejects: true });
    // jsdom does not implement execCommand, so provide the failing shape.
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: () => false,
    });

    const result = await writeRichClipboard(
      buildTablePayload(TABLE, { useFirstRowAsHeader: true }),
    );

    expect(result).toBe("failed");
  });
});
