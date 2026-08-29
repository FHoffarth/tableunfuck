import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";

function pasteIntoDocument(data: { html?: string; text?: string }) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      getData: (type: string) =>
        (type === "text/html" ? data.html : data.text) ?? "",
    },
  });
  act(() => {
    document.dispatchEvent(event);
  });
}

/** The rendered Table output, read back as a plain grid. */
function readOutputTable(): { header: string[]; body: string[][] } {
  const root = screen.getByTestId("output-table");
  const header = Array.from(root.querySelectorAll("thead th")).map(
    (th) => th.textContent ?? "",
  );
  const body = Array.from(root.querySelectorAll("tbody tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td) => td.textContent ?? ""),
  );
  return { header, body };
}

/** jsdom's Blob has no .text(), so read it the long way. */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

class FakeClipboardItem {
  constructor(public readonly items: Record<string, Blob>) {}
}

describe("TableUnfuck", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("goes from an HTML paste to a preview and copyable Markdown", async () => {
    render(<App />);

    expect(screen.getByText(/nothing pasted yet/i)).toBeInTheDocument();

    pasteIntoDocument({
      html: `<table>
        <tr><th>Name</th><th>Role</th></tr>
        <tr><td>Ada</td><td>Engineer</td></tr>
      </table>`,
      text: "Name\tRole\nAda\tEngineer",
    });

    // Source detection line, plus the raw clipboard flavour kept as secondary info
    expect(await screen.findByText(/detected as/i)).toBeInTheDocument();
    expect(screen.getByText("HTML table")).toBeInTheDocument();
    expect(screen.getByText("text/html")).toBeInTheDocument();

    // Preview shows the real cells
    const preview = document.querySelector(".sheet table")!;
    expect(within(preview as HTMLElement).getByText("Ada")).toBeInTheDocument();
    expect(within(preview as HTMLElement).getByText("Engineer")).toBeInTheDocument();

    // <th> evidence auto-selects the header row
    expect(screen.getByLabelText(/first row is the header/i)).toBeChecked();

    // Markdown output is unchanged by this slice, and still copyable
    fireEvent.click(screen.getByRole("tab", { name: "Markdown" }));
    const output = screen.getByTestId("output");
    expect(output.textContent).toBe(
      ["| Name | Role |", "| --- | --- |", "| Ada | Engineer |"].join("\n"),
    );

    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(output.textContent);
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("switches output formats and clears back to the empty state", async () => {
    render(<App />);
    pasteIntoDocument({ text: "a\tb\nc\td" });

    fireEvent.click(screen.getByRole("tab", { name: "TSV" }));
    expect(screen.getByTestId("output").textContent).toBe("a\tb\nc\td");

    fireEvent.click(screen.getByRole("tab", { name: "JSON" }));
    expect(JSON.parse(screen.getByTestId("output").textContent!)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByText(/nothing pasted yet/i)).toBeInTheDocument();
    expect(screen.getByTestId("output").textContent).toBe("");
  });

  it("surfaces parser warnings instead of hiding them", async () => {
    render(<App />);
    pasteIntoDocument({
      html: `<table>
        <tr><td colspan="2">Q1</td><td>Q2</td></tr>
        <tr><td>a</td><td>b</td><td>c</td></tr>
      </table>`,
    });

    expect(await screen.findByText(/what the parser changed/i)).toBeInTheDocument();
    expect(screen.getByText(/merged cells/i)).toBeInTheDocument();
  });

  it("does not turn pasted prose into a fake table", async () => {
    render(<App />);
    pasteIntoDocument({
      text: "This is prose about a table.\nIt has a second sentence.",
    });

    expect(await screen.findByText(/low confidence/i)).toBeInTheDocument();
    const rows = document.querySelectorAll(".sheet table tr");
    rows.forEach((row) => expect(row.querySelectorAll("td")).toHaveLength(1));
  });

  describe("Table output", () => {
    it("is the default mode and mirrors the parsed rows and columns", () => {
      render(<App />);
      expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      pasteIntoDocument({ text: "Name\tRole\nAda\tEngineer\nGrace\tArchitect" });

      const { header, body } = readOutputTable();
      expect(header).toEqual([]);
      expect(body).toEqual([
        ["Name", "Role"],
        ["Ada", "Engineer"],
        ["Grace", "Architect"],
      ]);
    });

    it("preserves explicit header state", () => {
      render(<App />);
      pasteIntoDocument({ text: "Name\tRole\nAda\tEngineer" });

      fireEvent.click(screen.getByLabelText(/first row is the header/i));

      const { header, body } = readOutputTable();
      expect(header).toEqual(["Name", "Role"]);
      expect(body).toEqual([["Ada", "Engineer"]]);
    });

    it("invents no column names when no header is marked", () => {
      render(<App />);
      pasteIntoDocument({ text: "Ada\tEngineer" });

      const { header, body } = readOutputTable();
      expect(header).toEqual([]);
      expect(body).toEqual([["Ada", "Engineer"]]);
      expect(screen.getByTestId("output-table").textContent).not.toMatch(
        /column\s*\d/i,
      );
    });

    it("copies a rich text/html payload with a TSV plain-text fallback", async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("ClipboardItem", FakeClipboardItem);
      Object.assign(navigator, {
        clipboard: { write, writeText: vi.fn().mockResolvedValue(undefined) },
      });

      render(<App />);
      pasteIntoDocument({ text: "Name\tRole\nAda\tEngineer" });
      fireEvent.click(screen.getByLabelText(/first row is the header/i));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /copy table/i }));
      });

      expect(write).toHaveBeenCalledTimes(1);
      const [items] = write.mock.calls[0] as [FakeClipboardItem[]];
      const flavours = items[0].items;

      expect(Object.keys(flavours).sort()).toEqual(["text/html", "text/plain"]);
      await expect(readBlob(flavours["text/html"])).resolves.toContain("<table");
      await expect(readBlob(flavours["text/plain"])).resolves.toBe(
        "Name\tRole\nAda\tEngineer",
      );
    });
  });

  describe("language switch", () => {
    it("changes the UI copy in both directions", () => {
      render(<App />);

      expect(screen.getByText("Messy table in. Clean table out.")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Table" })).toBeInTheDocument();
      expect(screen.getByText(/copy a clean table into documents/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "DE" }));

      expect(
        screen.getByText("Kaputte Tabelle rein. Saubere Tabelle raus."),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Tabelle" })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Deine Tabelleninhalte werden lokal in deinem Browser verarbeitet und von TableUnfuck nicht hochgeladen.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(/als saubere Tabelle in Dokumente/i)).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Erste Zeile ist die Kopfzeile/i),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "EN" }));
      expect(screen.getByText("Messy table in. Clean table out.")).toBeInTheDocument();
    });

    it("does not touch the input, the parsed data or the output", () => {
      render(<App />);
      pasteIntoDocument({ text: "Name\tRole\nAda\tEngineer" });
      fireEvent.click(screen.getByLabelText(/first row is the header/i));

      const before = readOutputTable();
      const rawBefore = (
        screen.getByLabelText(/paste a table here/i) as HTMLTextAreaElement
      ).value;

      fireEvent.click(screen.getByRole("button", { name: "DE" }));

      expect(readOutputTable()).toEqual(before);
      expect(
        (screen.getByLabelText(/Erste Zeile ist die Kopfzeile/i) as HTMLInputElement)
          .checked,
      ).toBe(true);
      expect(
        (screen.getByLabelText(/Tabelle hier einfügen/i) as HTMLTextAreaElement).value,
      ).toBe(rawBefore);

      // Text formats are unaffected too.
      fireEvent.click(screen.getByRole("tab", { name: "TSV" }));
      expect(screen.getByTestId("output").textContent).toBe("Name\tRole\nAda\tEngineer");

      fireEvent.click(screen.getByRole("button", { name: "EN" }));
      expect(screen.getByTestId("output").textContent).toBe("Name\tRole\nAda\tEngineer");
    });

    it("shows precise privacy copy and language-matched legal links", () => {
      render(<App />);

      expect(
        screen.getByText(
          "Your table contents are processed locally in your browser and are not uploaded by TableUnfuck.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText("Everything stays in your browser")).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "TableUnfuck does not persist table contents between visits.",
          { exact: false },
        ),
      ).toBeInTheDocument();

      const englishFooter = screen.getByRole("navigation", { name: "Footer links" });
      expect(within(englishFooter).getByRole("link", { name: "Privacy" })).toHaveAttribute(
        "href",
        "https://debother.com/privacy/",
      );
      expect(within(englishFooter).getByRole("link", { name: "Imprint" })).toHaveAttribute(
        "href",
        "https://debother.com/imprint/",
      );
      expect(
        within(englishFooter).getByRole("link", { name: "Made by debother." }),
      ).toHaveAttribute("href", "https://debother.com/");
      expect(within(englishFooter).getByRole("link", { name: "GitHub" })).toHaveAttribute(
        "href",
        "https://github.com/debother/tableunfuck",
      );

      fireEvent.click(screen.getByRole("button", { name: "DE" }));

      const germanFooter = screen.getByRole("navigation", { name: "Footer-Links" });
      expect(
        within(germanFooter).getByRole("link", { name: "Datenschutz" }),
      ).toHaveAttribute("href", "https://debother.com/datenschutz/");
      expect(within(germanFooter).getByRole("link", { name: "Impressum" })).toHaveAttribute(
        "href",
        "https://debother.com/impressum/",
      );
      expect(
        within(germanFooter).getByRole("link", { name: "Made by debother." }),
      ).toHaveAttribute("href", "https://debother.com/");
      expect(within(germanFooter).getByRole("link", { name: "GitHub" })).toHaveAttribute(
        "href",
        "https://github.com/debother/tableunfuck",
      );
      expect(
        screen.getByText(
          "TableUnfuck speichert Tabelleninhalte nicht zwischen Besuchen.",
          { exact: false },
        ),
      ).toBeInTheDocument();
    });
  });
});
