import { describe, expect, it } from "vitest";
import { withZone } from "@/components/LocalDate";

describe("LocalDate formatting", () => {
  const d = new Date("2026-10-12T14:50:21Z");
  it("labels the server-side time as UTC without throwing", () => {
    expect(withZone(d, false, "UTC")).toBe("Oct 12, 2026, 2:50 PM UTC");
  });
  it("shows local time with a zone label", () => {
    expect(withZone(d, false, "America/Chicago")).toBe("Oct 12, 2026, 9:50 AM CDT");
  });
  it("formats date-only values", () => {
    expect(withZone(d, true, "UTC")).toBe("Oct 12, 2026");
  });
});
