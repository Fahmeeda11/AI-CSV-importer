import type { NextFunction, Request, Response } from "express";
import { isAiConfigured } from "../config/env.js";
import { AiNotConfiguredError } from "../lib/openaiClient.js";
import type { StreamEvent } from "../domain/crm.js";
import { parseCsv } from "../services/csvService.js";
import { runImport, streamImport } from "../services/importService.js";

function requireFile(req: Request): Buffer {
  if (!req.file) {
    const err = new Error("No file uploaded. Attach a CSV under the `file` field.");
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  return req.file.buffer;
}

/** POST /api/import — parse + AI-extract, return the full result as JSON. */
export async function importCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isAiConfigured()) throw new AiNotConfiguredError();
    const rows = parseCsv(requireFile(req));
    const result = await runImport(rows);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/import/stream — parse + AI-extract, streaming NDJSON events so the
 * client can render progress and rows incrementally.
 */
export async function importCsvStream(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!isAiConfigured()) throw new AiNotConfiguredError();
    const rows = parseCsv(requireFile(req));

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const write = (event: StreamEvent) => res.write(JSON.stringify(event) + "\n");

    await streamImport(rows, write);
    res.end();
  } catch (err) {
    // If headers already went out, emit a terminal error event; else delegate.
    if (res.headersSent) {
      const message = err instanceof Error ? err.message : String(err);
      res.write(JSON.stringify({ type: "error", message } satisfies StreamEvent) + "\n");
      res.end();
    } else {
      next(err);
    }
  }
}
