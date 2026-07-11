import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { runImport } from "../src/services/importService.js";
import { CRM_FIELDS, type RawRow } from "../src/domain/crm.js";

/** Build a fake OpenAI client that maps a few obvious columns. */
function fakeClient(behavior?: { throwAlways?: boolean }): OpenAI {
  const create = async (params: {
    messages: { role: string; content: string }[];
  }) => {
    if (behavior?.throwAlways) throw new Error("simulated provider outage");

    const user = params.messages.find((m) => m.role === "user")!.content;
    const rows = JSON.parse(user.slice(user.indexOf("["))) as Array<
      Record<string, string> & { source_index: number }
    >;

    const records = rows.map((r) => {
      const base = Object.fromEntries(CRM_FIELDS.map((f) => [f, ""]));
      return {
        ...base,
        source_index: r.source_index,
        confidence: 90,
        name: r.name ?? "",
        email: r.email ?? "",
        mobile_without_country_code: r.mobile ?? "",
      };
    });

    return { choices: [{ message: { content: JSON.stringify({ records }) } }] };
  };

  return { chat: { completions: { create } } } as unknown as OpenAI;
}

describe("runImport", () => {
  it("imports valid rows and skips rows with no contact", async () => {
    const rows: RawRow[] = [
      { name: "Alice", email: "alice@x.com", mobile: "9876500001" },
      { name: "Bob", email: "", mobile: "" }, // no contact -> skipped
      { name: "Cara", email: "", mobile: "9876500003" },
    ];

    const result = await runImport(rows, { client: fakeClient() });

    expect(result.summary.totalRows).toBe(3);
    expect(result.summary.imported).toBe(2);
    expect(result.summary.skipped).toBe(1);
    expect(result.records.map((r) => r.data.name)).toEqual(["Alice", "Cara"]);
    expect(result.records[0]!.confidence).toBe(90);
    expect(result.skipped[0]!.raw.name).toBe("Bob");
  });

  it("surfaces a permanently failing batch as skipped rows", async () => {
    const rows: RawRow[] = [{ name: "X", email: "x@y.com", mobile: "" }];
    const result = await runImport(rows, { client: fakeClient({ throwAlways: true }) });

    expect(result.summary.failedBatches).toBe(1);
    expect(result.summary.imported).toBe(0);
    expect(result.summary.skipped).toBe(1);
    expect(result.skipped[0]!.reason).toMatch(/AI batch failed/i);
  });
});
