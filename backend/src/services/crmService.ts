import {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  emptyCrmRecord,
  type CrmField,
  type CrmRecord,
  type RawRow,
  type SkippedRecord,
} from "../domain/crm.js";

// Result of normalizing a single AI-mapped record.
export type NormalizeResult =
  | { kind: "record"; record: CrmRecord; confidence: number }
  | { kind: "skipped"; skipped: SkippedRecord };

const EMAIL_RE = /[^\s,;<>()"']+@[^\s,;<>()"']+\.[^\s,;<>()"']+/g;
// Phone-like tokens: optional +, then 7+ digits possibly separated by spaces/-/()/./
const PHONE_RE = /\+?\d[\d\s\-().]{5,}\d/g;


export function normalizeRecord(
  aiRecord: Partial<Record<CrmField, unknown>> & { confidence?: unknown },
  raw: RawRow,
  rowIndex: number
): NormalizeResult {
  const record = emptyCrmRecord();
  for (const field of CRM_FIELDS) {
    record[field] = toStr(aiRecord[field]);
  }
  const confidence = clampConfidence(aiRecord.confidence);

  const noteExtras: string[] = [];

  // Emails: keep the first, push the rest to notes
  const emails = dedupe(extractAll(record.email, EMAIL_RE));
  if (emails.length > 0) {
    record.email = emails[0]!;
    for (const extra of emails.slice(1)) noteExtras.push(`Additional email: ${extra}`);
  } else {
    // No valid email pattern -> treat as blank (avoids passing junk through).
    record.email = record.email.includes("@") ? record.email.trim() : "";
  }

  // Mobiles: keep the first, push the rest to notes
  const mobiles = dedupe(extractAll(record.mobile_without_country_code, PHONE_RE).map(cleanPhone));
  if (mobiles.length > 0) {
    record.mobile_without_country_code = mobiles[0]!;
    for (const extra of mobiles.slice(1)) noteExtras.push(`Additional mobile: ${extra}`);
  } else {
    record.mobile_without_country_code = "";
  }

  // Closed enums
  record.crm_status = coerceStatus(record.crm_status);
  record.data_source = coerceEnum(record.data_source, DATA_SOURCE_VALUES);

  // Date must be JS-parseable, else blank
  record.created_at = normalizeDate(record.created_at);

  // Country code sanity: keep a leading + and digits
  record.country_code = normalizeCountryCode(record.country_code);

  // Fold extras into crm_note (and drop empty "Label:" fragments)
  record.crm_note = cleanNote(joinNote(record.crm_note, noteExtras));

  // CSV-safety: collapse newlines to the literal escape "\n" 
  for (const field of CRM_FIELDS) {
    record[field] = escapeNewlines(record[field]);
  }

  // Skip rule: neither email nor mobile
  if (!record.email && !record.mobile_without_country_code) {
    return {
      kind: "skipped",
      skipped: {
        rowIndex,
        reason: "No email or mobile number found.",
        raw,
        data: record,
        confidence,
      },
    };
  }

  return { kind: "record", record, confidence };
}

// helpers

function toStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

// Coerce the model's confidence into an integer in [0, 100]; default 50.
function clampConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function extractAll(value: string, re: RegExp): string[] {
  if (!value) return [];
  const matches = value.match(re);
  return matches ? matches.map((m) => m.trim()).filter(Boolean) : [];
}

function cleanPhone(p: string): string {
  const sign = p.trim().startsWith("+") ? "+" : "";
  return sign + p.replace(/[^\d]/g, "");
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function coerceEnum<T extends readonly string[]>(value: string, allowed: T): string {
  if (!value) return "";
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const match = allowed.find((a) => a.toUpperCase() === normalized);
  return match ?? "";
}

// Common status phrasings mapped onto the four allowed CRM statuses.
const STATUS_SYNONYMS: Record<string, string> = {
  NOT_CONNECTED: "DID_NOT_CONNECT",
  COULD_NOT_CONNECT: "DID_NOT_CONNECT",
  NO_RESPONSE: "DID_NOT_CONNECT",
  NO_ANSWER: "DID_NOT_CONNECT",
  UNREACHABLE: "DID_NOT_CONNECT",
  NOT_REACHABLE: "DID_NOT_CONNECT",
  RINGING: "DID_NOT_CONNECT",
  BUSY: "DID_NOT_CONNECT",
  GOOD_LEAD: "GOOD_LEAD_FOLLOW_UP",
  FOLLOW_UP: "GOOD_LEAD_FOLLOW_UP",
  INTERESTED: "GOOD_LEAD_FOLLOW_UP",
  HOT_LEAD: "GOOD_LEAD_FOLLOW_UP",
  WARM_LEAD: "GOOD_LEAD_FOLLOW_UP",
  NOT_INTERESTED: "BAD_LEAD",
  JUNK: "BAD_LEAD",
  JUNK_LEAD: "BAD_LEAD",
  INVALID: "BAD_LEAD",
  LOST: "BAD_LEAD",
  CLOSED: "SALE_DONE",
  CLOSED_WON: "SALE_DONE",
  WON: "SALE_DONE",
  SOLD: "SALE_DONE",
  BOOKED: "SALE_DONE",
  DEAL_CLOSED: "SALE_DONE",
  CONVERTED: "SALE_DONE",
};

// Coerce a status: exact allowed value, then a known synonym, else blank.
function coerceStatus(value: string): string {
  const exact = coerceEnum(value, CRM_STATUS_VALUES);
  if (exact) return exact;
  if (!value) return "";
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return STATUS_SYNONYMS[normalized] ?? "";
}

// Keep the original string if `new Date()` accepts it; otherwise blank.
export function normalizeDate(value: string): string {
  if (!value) return "";
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? "" : value;
}

function normalizeCountryCode(value: string): string {
  if (!value) return "";
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

function joinNote(existing: string, extras: string[]): string {
  const parts = [existing.trim(), ...extras].filter(Boolean);
  return parts.join(" | ");
}

// Drop note fragments that are just an empty label like "Alt Phone:".
function cleanNote(note: string): string {
  return note
    .split(/\s*\|\s*/)
    .map((s) => s.trim())
    .filter((s) => s && !/^[A-Za-z][\w .-]*:\s*$/.test(s))
    .join(" | ");
}

function escapeNewlines(value: string): string {
  return value.replace(/\r\n|\r|\n/g, "\\n");
}
