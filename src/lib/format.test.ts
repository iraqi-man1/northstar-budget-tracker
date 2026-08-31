import { describe, expect, it } from "vitest";
import { formatCurrency, formatIqdInput, normalizeIqdInput } from "./format";

describe("Iraqi dinar formatting", () => {
  it.each([
    [1_000, "1.000 IQD"],
    [10_000, "10.000 IQD"],
    [100_000, "100.000 IQD"],
    [1_000_000, "1.000.000 IQD"],
  ])("formats %i with dot thousand separators", (amount, expected) => {
    expect(formatCurrency(amount, "IQD")).toBe(expected);
    expect(formatCurrency(amount, "IQD", true)).toBe(expected);
  });

  it("formats and normalizes the IQD value used by money inputs", () => {
    expect(formatIqdInput("1000000")).toBe("1.000.000");
    expect(normalizeIqdInput("1.000.000 IQD")).toBe("1000000");
  });
});
