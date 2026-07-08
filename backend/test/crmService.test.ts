import { describe, expect, it } from "vitest";
import { normalizeRecord } from "../src/services/crmService.js";
import type { RawRow } from "../src/domain/crm.js";

const raw: RawRow = { any: "row" };

function makeAi(overrides: Record<string, unknown>) {
  return overrides;
}

describe("normalizeRecord", () => {
  it("keeps a valid record and preserves core fields", () => {
    const res = normalizeRecord(
      makeAi({
        created_at: "2026-05-13 14:20:48",
        name: "John Doe",
        email: "john@example.com",
        mobile_without_country_code: "9876543210",
        crm_status: "GOOD_LEAD_FOLLOW_UP",
        data_source: "leads_on_demand",
      }),
      raw,
      0
    );
    expect(res.kind).toBe("record");
    if (res.kind !== "record") return;
    expect(res.record.name).toBe("John Doe");
    expect(res.record.email).toBe("john@example.com");
    expect(res.record.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(res.record.data_source).toBe("leads_on_demand");
  });

  it("skips a record with neither email nor mobile", () => {
    const res = normalizeRecord(makeAi({ name: "No Contact" }), raw, 3);
    expect(res.kind).toBe("skipped");
    if (res.kind !== "skipped") return;
    expect(res.skipped.rowIndex).toBe(3);
    expect(res.skipped.reason).toMatch(/no email or mobile/i);
  });

  it("coerces an unknown crm_status to blank", () => {
    const res = normalizeRecord(
      makeAi({ email: "a@b.com", crm_status: "SOMETHING_ELSE" }),
      raw,
      0
    );
    expect(res.kind).toBe("record");
    if (res.kind !== "record") return;
    expect(res.record.crm_status).toBe("");
  });

  it("normalizes a case/spacing variant of crm_status", () => {
    const res = normalizeRecord(makeAi({ email: "a@b.com", crm_status: "sale done" }), raw, 0);
    if (res.kind !== "record") throw new Error("expected record");
    expect(res.record.crm_status).toBe("SALE_DONE");
  });

  it("coerces an unknown data_source to blank", () => {
    const res = normalizeRecord(makeAi({ email: "a@b.com", data_source: "instagram" }), raw, 0);
    if (res.kind !== "record") throw new Error("expected record");
    expect(res.record.data_source).toBe("");
  });

  it("keeps the first email and appends extras to crm_note", () => {
    const res = normalizeRecord(
      makeAi({ email: "first@x.com; second@y.com", mobile_without_country_code: "" }),
      raw,
      0
    );
    if (res.kind !== "record") throw new Error("expected record");
    expect(res.record.email).toBe("first@x.com");
    expect(res.record.crm_note).toContain("second@y.com");
  });

  it("keeps the first mobile and appends extras to crm_note", () => {
    const res = normalizeRecord(
      makeAi({ mobile_without_country_code: "9876543210 / 9000011111" }),
      raw,
      0
    );
    if (res.kind !== "record") throw new Error("expected record");
    expect(res.record.mobile_without_country_code).toBe("9876543210");
    expect(res.record.crm_note).toContain("9000011111");
  });

  it("blanks an unparseable created_at but keeps a valid one", () => {
    const bad = normalizeRecord(makeAi({ email: "a@b.com", created_at: "not a date" }), raw, 0);
    if (bad.kind !== "record") throw new Error("expected record");
    expect(bad.record.created_at).toBe("");

    const good = normalizeRecord(
      makeAi({ email: "a@b.com", created_at: "2026-05-13T14:20:48Z" }),
      raw,
      0
    );
    if (good.kind !== "record") throw new Error("expected record");
    expect(Number.isNaN(new Date(good.record.created_at).getTime())).toBe(false);
  });

  it("escapes newlines so the record stays one CSV row", () => {
    const res = normalizeRecord(
      makeAi({ email: "a@b.com", description: "line one\nline two\r\nline three" }),
      raw,
      0
    );
    if (res.kind !== "record") throw new Error("expected record");
    expect(res.record.description).not.toMatch(/[\r\n]/);
    expect(res.record.description).toContain("\\n");
  });

  it("normalizes a country code to +digits", () => {
    const res = normalizeRecord(
      makeAi({ email: "a@b.com", country_code: "91" }),
      raw,
      0
    );
    if (res.kind !== "record") throw new Error("expected record");
    expect(res.record.country_code).toBe("+91");
  });
});
