export type TableSource = "html" | "tsv" | "text";

export type Confidence = "high" | "medium" | "low";

export type ParsedTable = {
  /** Canonical representation. Always rectangular: every row has the same length. */
  rows: string[][];
  source: TableSource;
  warnings: string[];
  /**
   * True only when the input carried real evidence of a header row
   * (e.g. `<th>` cells or a `<thead>`). Never inferred from content.
   */
  hasHeaderEvidence: boolean;
  confidence: Confidence;
};

export const EMPTY_TABLE: ParsedTable = {
  rows: [],
  source: "text",
  warnings: [],
  hasHeaderEvidence: false,
  confidence: "low",
};
