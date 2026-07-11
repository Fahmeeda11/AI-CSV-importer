import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { logger } from "../lib/logger.js";
import { AiNotConfiguredError } from "../lib/openaiClient.js";
import { CsvParseError } from "../services/csvService.js";

// Central error handler mapping known errors to clean HTTP responses.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) return;

  if (err instanceof MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    res.status(status).json({ error: "upload_error", message: err.message });
    return;
  }

  if (err instanceof CsvParseError) {
    res.status(422).json({ error: "csv_parse_error", message: err.message });
    return;
  }

  if (err instanceof AiNotConfiguredError) {
    res.status(503).json({ error: "ai_not_configured", message: err.message });
    return;
  }

  if (err instanceof Error && err.message === "Only .csv files are supported.") {
    res.status(415).json({ error: "unsupported_media_type", message: err.message });
    return;
  }

  logger.error({ err: err instanceof Error ? err.stack : err }, "Unhandled error");
  res.status(500).json({ error: "internal_error", message: "Something went wrong." });
}

// 404 fallthrough.
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "Route not found." });
}
