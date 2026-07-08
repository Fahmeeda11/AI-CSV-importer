import { describe, expect, it } from "vitest";
import { importReducer, initialState } from "@/lib/reducer";
import { CRM_FIELDS, type CrmRecord } from "@/lib/types";

const rec = (name: string): CrmRecord =>
  ({ ...Object.fromEntries(CRM_FIELDS.map((f) => [f, ""])), name }) as CrmRecord;

describe("importReducer", () => {
  it("moves to previewing when a preview is ready", () => {
    const parsed = { headers: ["a"], rows: [{ a: "1" }], fileName: "f.csv" };
    const next = importReducer(initialState, { type: "PREVIEW_READY", parsed });
    expect(next.phase).toBe("previewing");
    expect(next.parsed).toBe(parsed);
  });

  it("accumulates records and skipped across batches", () => {
    let s = importReducer(initialState, { type: "START_PROCESSING" });
    s = importReducer(s, { type: "META", totalRows: 3, totalBatches: 2 });
    s = importReducer(s, {
      type: "BATCH",
      records: [rec("A")],
      skipped: [{ rowIndex: 1, reason: "no contact", raw: {} }],
    });
    s = importReducer(s, { type: "BATCH", records: [rec("B")], skipped: [] });
    expect(s.records).toHaveLength(2);
    expect(s.skipped).toHaveLength(1);
    expect(s.batchesDone).toBe(2);
  });

  it("captures the summary on done", () => {
    const summary = { totalRows: 3, imported: 2, skipped: 1, batches: 2, failedBatches: 0 };
    const s = importReducer(initialState, { type: "DONE", summary });
    expect(s.phase).toBe("done");
    expect(s.summary).toEqual(summary);
  });

  it("resets to the initial state", () => {
    const dirty = importReducer(initialState, { type: "ERROR", message: "boom" });
    expect(importReducer(dirty, { type: "RESET" })).toEqual(initialState);
  });
});
