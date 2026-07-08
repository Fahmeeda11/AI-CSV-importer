import type { CrmRecord, ImportSummary, ParsedCsv, SkippedRecord } from "./types";

export type Phase = "idle" | "previewing" | "processing" | "done" | "error";

export interface ImportState {
  phase: Phase;
  parsed: ParsedCsv | null;
  records: CrmRecord[];
  skipped: SkippedRecord[];
  summary: ImportSummary | null;
  /** Batches completed so far / expected total, for the progress bar. */
  batchesDone: number;
  totalBatches: number;
  totalRows: number;
  error: string | null;
}

export const initialState: ImportState = {
  phase: "idle",
  parsed: null,
  records: [],
  skipped: [],
  summary: null,
  batchesDone: 0,
  totalBatches: 0,
  totalRows: 0,
  error: null,
};

export type Action =
  | { type: "PREVIEW_READY"; parsed: ParsedCsv }
  | { type: "RESET" }
  | { type: "START_PROCESSING" }
  | { type: "META"; totalRows: number; totalBatches: number }
  | { type: "BATCH"; records: CrmRecord[]; skipped: SkippedRecord[] }
  | { type: "DONE"; summary: ImportSummary }
  | { type: "ERROR"; message: string };

export function importReducer(state: ImportState, action: Action): ImportState {
  switch (action.type) {
    case "PREVIEW_READY":
      return { ...initialState, phase: "previewing", parsed: action.parsed };
    case "RESET":
      return initialState;
    case "START_PROCESSING":
      return {
        ...state,
        phase: "processing",
        records: [],
        skipped: [],
        summary: null,
        batchesDone: 0,
        totalBatches: 0,
        error: null,
      };
    case "META":
      return { ...state, totalRows: action.totalRows, totalBatches: action.totalBatches };
    case "BATCH":
      return {
        ...state,
        batchesDone: state.batchesDone + 1,
        records: [...state.records, ...action.records],
        skipped: [...state.skipped, ...action.skipped],
      };
    case "DONE":
      return { ...state, phase: "done", summary: action.summary };
    case "ERROR":
      return { ...state, phase: "error", error: action.message };
    default:
      return state;
  }
}
