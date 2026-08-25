import { describe, expect, it, vi, beforeEach } from "vitest";
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

describe("TableUnfuck", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
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

    // Source detection badge
    expect(await screen.findByText(/read as text\/html/i)).toBeInTheDocument();

    // Preview shows the real cells
    const preview = document.querySelector(".sheet table")!;
    expect(within(preview as HTMLElement).getByText("Ada")).toBeInTheDocument();
    expect(within(preview as HTMLElement).getByText("Engineer")).toBeInTheDocument();

    // <th> evidence auto-selects the header row
    expect(screen.getByLabelText(/first row is the header/i)).toBeChecked();

    // Markdown output is rendered and copyable
    const output = screen.getByTestId("output");
    expect(output.textContent).toBe(
      ["| Name | Role |", "| --- | --- |", "| Ada | Engineer |"].join("\n"),
    );

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
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
});
