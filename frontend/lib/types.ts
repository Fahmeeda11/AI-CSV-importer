/**
 * Client-side mirror of the backend CRM contract
 * (`backend/src/domain/crm.ts`). Kept intentionally small so the frontend
 * deploys independently. If the backend schema changes, update this too.
 */

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
export type CrmRecord = Record<CrmField, string>;

export type RawRow = Record<string, string>;

/** Allowed closed-enum values (mirror of the backend domain). */
export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

/** An imported record plus the AI's 0–100 confidence in the mapping. */
export interface ExtractedRecord {
  data: CrmRecord;
  confidence: number;
}

export interface SkippedRecord {
  rowIndex: number;
  reason: string;
  raw: RawRow;
  data: CrmRecord;
  confidence: number;
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  skipped: number;
  batches: number;
  failedBatches: number;
}

export interface ImportResult {
  records: ExtractedRecord[];
  skipped: SkippedRecord[];
  summary: ImportSummary;
}

/** Parsed CSV preview produced client-side (no AI). */
export interface ParsedCsv {
  headers: string[];
  rows: RawRow[];
  fileName: string;
}

/* Streaming (NDJSON) events emitted by the backend. */
export type StreamEvent =
  | { type: "meta"; totalRows: number; totalBatches: number }
  | { type: "batch"; index: number; records: ExtractedRecord[]; skipped: SkippedRecord[] }
  | { type: "batch_error"; index: number; message: string; skipped: SkippedRecord[] }
  | { type: "done"; summary: ImportSummary }
  | { type: "error"; message: string };
