import { describe, expect, it } from "vitest";
import { chunk, mapWithConcurrency } from "../src/lib/batch.js";

describe("chunk", () => {
  it("splits into fixed-size groups with a smaller tail", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns empty for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("throws on a non-positive size", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe("mapWithConcurrency", () => {
  it("preserves input order in the results", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });
});
