import type OpenAI from "openai";
import { env } from "../config/env.js";
import {
  CRM_FIELDS,
  CRM_FIELD_DESCRIPTIONS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  type CrmField,
  type RawRow,
} from "../domain/crm.js";
import { getOpenAI } from "../lib/openaiClient.js";
import { withRetry } from "../lib/retry.js";
import { logger } from "../lib/logger.js";

/*
One AI-mapped row: every CRM field, the index of its source row, and a
0–100 confidence in how well the source columns matched the CRM schema.
*/
export type AiMappedRow = { source_index: number; confidence: number } & Record<CrmField, string>;

/*
Map a batch of raw CSV rows onto the GrowEasy CRM schema using the LLM.
Returns one mapped object per input row (aligned via `source_index`).
A client can be injected for testing; production uses the shared singleton.
 */
export async function extractBatch(
  rows: RawRow[],
  batchIndex: number,
  deps: { client?: OpenAI } = {}
): Promise<AiMappedRow[]> {
  const client = deps.client ?? getOpenAI();

  const mapped = await withRetry(
    async (attempt) => {
      const completion = await client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(rows) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "crm_extraction",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI model");

      const parsed = JSON.parse(content) as { records?: AiMappedRow[] };
      if (!Array.isArray(parsed.records)) {
        throw new Error("AI response missing `records` array");
      }
      logger.debug({ batchIndex, attempt, count: parsed.records.length }, "AI batch mapped");
      return parsed.records;
    },
    {
      attempts: 3,
      onRetry: (error, attempt, delayMs) =>
        logger.warn(
          { batchIndex, attempt, delayMs, err: errMessage(error) },
          "Retrying AI batch"
        ),
    }
  );

  return alignToRows(mapped, rows);
}

/*
Guard against the model dropping or reordering rows: rebuild the array so
there is exactly one entry per input row, in order, using `source_index`
when present and falling back to position.
 */
function alignToRows(mapped: AiMappedRow[], rows: RawRow[]): AiMappedRow[] {
  const byIndex = new Map<number, AiMappedRow>();
  mapped.forEach((m, i) => {
    const idx = Number.isInteger(m.source_index) ? m.source_index : i;
    if (!byIndex.has(idx)) byIndex.set(idx, m);
  });

  return rows.map((_row, i): AiMappedRow => {
    const found = byIndex.get(i) ?? mapped[i];
    if (found) {
      return {
        ...blankFields(),
        ...found,
        source_index: i,
        confidence: typeof found.confidence === "number" ? found.confidence : 0,
      };
    }
    // Model omitted this row entirely — emit blanks; the normalizer will skip it.
    return { source_index: i, confidence: 0, ...blankFields() };
  });
}

function blankFields(): Record<CrmField, string> {
  return CRM_FIELDS.reduce((acc, f) => {
    acc[f] = "";
    return acc;
  }, {} as Record<CrmField, string>);
}

function buildUserPrompt(rows: RawRow[]): string {
  const indexed = rows.map((row, i) => ({ source_index: i, ...row }));
  return [
    "Map the following CSV rows to the GrowEasy CRM schema.",
    "Return exactly one object per input row, preserving `source_index`.",
    "",
    JSON.stringify(indexed, null, 2),
  ].join("\n");
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// prompt and schema

const FIELD_DOC = CRM_FIELDS.map((f) => `- ${f}: ${CRM_FIELD_DESCRIPTIONS[f]}`).join("\n");

export const SYSTEM_PROMPT = `You are a meticulous data-mapping engine for the GrowEasy CRM.
You receive rows from an arbitrary CSV (Facebook/Google Ads exports, real-estate CRMs,
spreadsheets, sales reports, etc.) with unpredictable column names, and map each row onto a
fixed CRM schema.

TARGET FIELDS (always output all of them; use "" when a value is unknown — never guess):
${FIELD_DOC}

MAPPING RULES:
1. Infer meaning from column NAMES and VALUES, not exact string matches. Examples of intent:
   "Full Name"/"Lead"/"Customer" -> name; "Phone"/"Contact"/"Mobile"/"WhatsApp" -> mobile;
   "E-mail"/"Email Address" -> email; "Org"/"Business" -> company; "Region"/"Province" -> state;
   "Source"/"Channel"/"Campaign" -> data_source; "Remarks"/"Comments"/"Notes" -> crm_note;
   "Owner"/"Agent"/"Assigned To" -> lead_owner; "Created"/"Date"/"Timestamp" -> created_at.
2. crm_status MUST be exactly one of: ${CRM_STATUS_VALUES.join(", ")}. Map common phrasings by
   meaning: "Not Connected"/"No Response"/"Unreachable"/"Busy"/"Ringing" -> DID_NOT_CONNECT;
   "Good Lead"/"Interested"/"Hot"/"Follow up" -> GOOD_LEAD_FOLLOW_UP; "Not Interested"/"Junk"/
   "Invalid"/"Lost" -> BAD_LEAD; "Sale Done"/"Closed"/"Won"/"Booked"/"Sold"/"Converted" ->
   SALE_DONE. If it still does not clearly match, output "".
3. data_source MUST be exactly one of: ${DATA_SOURCE_VALUES.join(", ")}. If none matches
   confidently, output "".
4. created_at MUST be a string parseable by JavaScript's \`new Date()\` (ISO-8601 preferred). If
   the source date is ambiguous or unparseable, output "".
5. Split combined values sensibly: if a phone value includes a country code, put it in
   country_code (e.g. "+91") and the rest in mobile_without_country_code.
6. Gather ALL emails and ALL phone numbers from EVERY column of the row (including columns like
   "Alt Phone", "Secondary Email", "WhatsApp", etc.). Use the FIRST email in \`email\` and the
   FIRST phone in \`mobile_without_country_code\`. Append every REMAINING email/phone VERBATIM to
   crm_note, e.g. "Additional mobile: 9812340000" or "Additional email: x@y.com". Do NOT summarise
   them as "two emails on file" — include the actual values. If a secondary column is empty,
   add nothing (never output an empty label like "Alt Phone:").
7. crm_note collects remarks, follow-up notes, the extra emails/phones from rule 6, and any useful
   information that does not fit another field.
8. Keep every value on a single line — replace any internal newlines with a space or "\\n".
9. Do NOT invent data. Only map what is present in the row.
10. confidence: an INTEGER 0-100 for how confident you are in THIS row's overall mapping. Judge by
    how clearly the source columns matched CRM fields and how clean the values were. Use ~90-100 for
    obvious, well-labelled data; ~60-85 when you had to infer column meaning; ~0-50 when columns were
    ambiguous, sparse, or messy.

Return an object: { "records": [ { "source_index": <int>, "confidence": <int>, ...all fields... }, ... ] }
with one entry per input row.`;

// JSON Schema for OpenAI Structured Outputs (strict: all fields required).
export const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          source_index: { type: "integer" },
          confidence: { type: "integer" },
          ...Object.fromEntries(CRM_FIELDS.map((f) => [f, { type: "string" }])),
        },
        required: ["source_index", "confidence", ...CRM_FIELDS],
      },
    },
  },
  required: ["records"],
} as const;
