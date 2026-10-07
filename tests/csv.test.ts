import { describe, expect, it } from "vitest";
import { toCsvCell } from "@/lib/csv";

describe("toCsvCell", () => {
  it("neutralizes formula-like values before CSV export", () => {
    expect(toCsvCell("=SUM(A1:A2)")).toBe("\"'=SUM(A1:A2)\"");
    expect(toCsvCell("=HYPERLINK(\"https://example.com\")")).toBe("\"'=HYPERLINK(\"\"https://example.com\"\")\"");
    expect(toCsvCell(" +SUM(A1:A2)")).toBe("\"' +SUM(A1:A2)\"");
    expect(toCsvCell("@cmd")).toBe("\"'@cmd\"");
    expect(toCsvCell("-1")).toBe("\"'-1\"");
  });
  it("retains normal values and escapes quotes", () => {
    expect(toCsvCell("Preview Company")).toBe("\"Preview Company\"");
    expect(toCsvCell('A "quoted" value')).toBe('"A ""quoted"" value"');
    expect(toCsvCell(null)).toBe('""');
  });
});
