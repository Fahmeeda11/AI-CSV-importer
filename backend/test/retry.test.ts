import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../src/lib/retry.js";

const noSleep = async () => {};

describe("withRetry", () => {
  it("returns immediately on first success", async () => {
    const fn = vi.fn(async () => "ok");
    const result = await withRetry(fn, { sleep: noSleep });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until it succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("transient");
        return "done";
      },
      { attempts: 5, sleep: noSleep }
    );
    expect(result).toBe("done");
    expect(calls).toBe(3);
  });

  it("throws the last error after exhausting attempts", async () => {
    const fn = vi.fn(async () => {
      throw new Error("always fails");
    });
    await expect(withRetry(fn, { attempts: 3, sleep: noSleep })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops early when shouldRetry returns false", async () => {
    const fn = vi.fn(async () => {
      throw new Error("fatal");
    });
    await expect(
      withRetry(fn, { attempts: 5, sleep: noSleep, shouldRetry: () => false })
    ).rejects.toThrow("fatal");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
