/**
 * Canonical GrowEasy CRM domain model.
 *
 * This is the single source of truth for the target schema, the closed
 * enumerations, and the API/stream contract. The frontend mirrors the
 * client-relevant parts of this file in `frontend/lib/types.ts` (kept
 * intentionally small so each app deploys independently).
 */

/** The 15 CRM fields, in canonical column order. */
export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

/** A CRM record: every field present, empty string when unknown. */
export type CrmRecord = Record<CrmField, string>;

/** Human-readable descriptions used to prompt the model. */
export const CRM_FIELD_DESCRIPTIONS: Record<CrmField, string> = {
  created_at: "Lead creation date/time (must be parseable by JavaScript `new Date()`).",
  name: "Lead's full name.",
  email: "Primary email address.",
  country_code: "Phone country code, e.g. +91.",
  mobile_without_country_code: "Mobile number without the country code.",
  company: "Company / organisation name.",
  city: "City.",
  state: "State / province.",
  country: "Country.",
  lead_owner: "Lead owner (agent/rep) — often an email or name.",
  crm_status: "Lead status — one of the allowed CRM_STATUS values, else blank.",
  crm_note: "Notes, remarks, follow-ups, extra phones/emails, and any info without a home.",
  data_source: "Lead source — one of the allowed DATA_SOURCE values, else blank.",
  possession_time: "Property possession time (real-estate context).",
  description: "Additional free-form description.",
};

/** Allowed values for `crm_status`. Anything else must become blank. */
export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

/** Allowed values for `data_source`. Anything else must become blank. */
export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

/** An empty CRM record with all fields blank. */
export function emptyCrmRecord(): CrmRecord {
  return CRM_FIELDS.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {} as CrmRecord);
}

/** A raw CSV row keyed by its original (arbitrary) header names. */
export type RawRow = Record<string, string>;

/** An imported record plus the AI's confidence in the mapping (0–100). */
export interface ExtractedRecord {
  data: CrmRecord;
  confidence: number;
}

/**
 * A record that was skipped, with the reason and its original data. Also carries
 * the AI's best-effort mapping (`data`) so the UI can let a user recover the row
 * by supplying a missing contact.
 */
export interface SkippedRecord {
  rowIndex: number;
  reason: string;
  raw: RawRow;
  data: CrmRecord;
  confidence: number;
}

/** Aggregate summary returned at the end of an import. */
export interface ImportSummary {
  totalRows: number;
  imported: number;
  skipped: number;
  batches: number;
  failedBatches: number;
}

/** Full (non-streaming) import response. */
export interface ImportResult {
  records: ExtractedRecord[];
  skipped: SkippedRecord[];
  summary: ImportSummary;
}

/* ------------------------------------------------------------------ */
/* Streaming (NDJSON) event contract                                  */
/* ------------------------------------------------------------------ */

export interface StreamMetaEvent {
  type: "meta";
  totalRows: number;
  totalBatches: number;
}

export interface StreamBatchEvent {
  type: "batch";
  index: number;
  records: ExtractedRecord[];
  skipped: SkippedRecord[];
}

export interface StreamBatchErrorEvent {
  type: "batch_error";
  index: number;
  message: string;
  /** Rows in the failed batch are surfaced as skipped so nothing is lost. */
  skipped: SkippedRecord[];
}

export interface StreamDoneEvent {
  type: "done";
  summary: ImportSummary;
}

export interface StreamErrorEvent {
  type: "error";
  message: string;
}

export type StreamEvent =
  | StreamMetaEvent
  | StreamBatchEvent
  | StreamBatchErrorEvent
  | StreamDoneEvent
  | StreamErrorEvent;
