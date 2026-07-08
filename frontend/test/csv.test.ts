import { describe, expect, it } from "vitest";
import { recordsToCsv } from "@/lib/csv";
import { CRM_FIELDS, type CrmRecord } from "@/lib/types";

function record(partial: Partial<CrmRecord>): CrmRecord {
  const base = Object.fromEntries(CRM_FIELDS.map((f) => [f, ""])) as CrmRecord;
  return { ...base, ...partial };
}

describe("recordsToCsv", () => {
  it("emits a header row with all 15 CRM fields", () => {
    const csv = recordsToCsv([record({ name: "John" })]);
    const header = csv.split("\n")[0]!;
    for (const field of CRM_FIELDS) {
      expect(header).toContain(field);
    }
  });

  it("includes record values in output", () => {
    const csv = recordsToCsv([record({ name: "Jane Doe", email: "jane@x.com" })]);
    expect(csv).toContain("Jane Doe");
    expect(csv).toContain("jane@x.com");
  });

  it("quotes fields containing commas", () => {
    const csv = recordsToCsv([record({ crm_note: "busy, call later" })]);
    expect(csv).toContain('"busy, call later"');
  });

  it("produces one data row per record", () => {
    const csv = recordsToCsv([record({ email: "a@x.com" }), record({ email: "b@x.com" })]);
    // header + 2 data rows
    expect(csv.trim().split("\n")).toHaveLength(3);
  });
});
