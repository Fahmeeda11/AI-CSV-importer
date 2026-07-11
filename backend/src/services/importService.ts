import type OpenAI from "openai";
import { env } from "../config/env.js";
import { chunk, mapWithConcurrency } from "../lib/batch.js";
import { logger } from "../lib/logger.js";
import {
  emptyCrmRecord,
  type ExtractedRecord,
  type ImportResult,
  type RawRow,
  type SkippedRecord,
  type StreamEvent,
} from "../domain/crm.js";
import { extractBatch } from "./aiService.js";
import { normalizeRecord } from "./crmService.js";

interface IndexedRow {
  index: number;
  raw: RawRow;
}

export interface ImportDeps {
  /** Injectable OpenAI client (tests). */
  client?: OpenAI;
}

/**
 * Stream an import: parse-to-CRM one batch at a time, emitting NDJSON-friendly
 * events (`meta` -> many `batch`/`batch_error` -> `done`). Batches run with
 * bounded concurrency; a batch that fails after retries surfaces its rows as
 * skipped so no lead is silently lost.
 */
export async function streamImport(
  rows: RawRow[],
  emit: (event: StreamEvent) => void,
  deps: ImportDeps = {}
): Promise<void> {
  const indexed: IndexedRow[] = rows.map((raw, index) => ({ index, raw }));
  const batches = chunk(indexed, env.BATCH_SIZE);

  emit({ type: "meta", totalRows: rows.length, totalBatches: batches.length });

  let imported = 0;
  let skipped = 0;
  let failedBatches = 0;

  await mapWithConcurrency(batches, env.AI_CONCURRENCY, async (batch, batchIndex) => {
    try {
      const { records, skippedRecords } = await processBatch(batch, batchIndex, deps);
      imported += records.length;
      skipped += skippedRecords.length;
      emit({ type: "batch", index: batchIndex, records, skipped: skippedRecords });
    } catch (error) {
      failedBatches += 1;
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ batchIndex, err: message }, "AI batch failed permanently");
      const skippedRecords: SkippedRecord[] = batch.map((b) => ({
        rowIndex: b.index,
        reason: `AI batch failed: ${message}`,
        raw: b.raw,
        data: emptyCrmRecord(),
        confidence: 0,
      }));
      skipped += skippedRecords.length;
      emit({ type: "batch_error", index: batchIndex, message, skipped: skippedRecords });
    }
  });

  emit({
    type: "done",
    summary: {
      totalRows: rows.length,
      imported,
      skipped,
      batches: batches.length,
      failedBatches,
    },
  });
}

/** Aggregate variant: run the same pipeline and collect a single result. */
export async function runImport(rows: RawRow[], deps: ImportDeps = {}): Promise<ImportResult> {
  const records: ExtractedRecord[] = [];
  const skipped: SkippedRecord[] = [];
  let summary: ImportResult["summary"] = {
    totalRows: rows.length,
    imported: 0,
    skipped: 0,
    batches: 0,
    failedBatches: 0,
  };

  await streamImport(
    rows,
    (event) => {
      if (event.type === "batch" || event.type === "batch_error") {
        if ("records" in event) records.push(...event.records);
        skipped.push(...event.skipped);
      } else if (event.type === "done") {
        summary = event.summary;
      }
    },
    deps
  );

  return { records, skipped, summary };
}

async function processBatch(
  batch: IndexedRow[],
  batchIndex: number,
  deps: ImportDeps
): Promise<{ records: ExtractedRecord[]; skippedRecords: SkippedRecord[] }> {
  const mapped = await extractBatch(
    batch.map((b) => b.raw),
    batchIndex,
    deps
  );

  const records: ExtractedRecord[] = [];
  const skippedRecords: SkippedRecord[] = [];

  batch.forEach((row, localIdx) => {
    const result = normalizeRecord(mapped[localIdx] ?? {}, row.raw, row.index);
    if (result.kind === "record") {
      records.push({ data: result.record, confidence: result.confidence });
    } else {
      skippedRecords.push(result.skipped);
    }
  });

  return { records, skippedRecords };
}
