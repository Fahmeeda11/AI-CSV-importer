import multer from "multer";
import type { Request } from "express";
import { env } from "../config/env.js";

/**
 * In-memory multipart upload for a single CSV file (`file` field).
 * Size-limited; we keep the buffer in memory since files are small and the
 * service is stateless (no disk persistence needed).
 */
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req: Request, file, cb) => {
    const name = file.originalname.toLowerCase();
    const looksCsv =
      name.endsWith(".csv") ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/plain" ||
      file.mimetype === "application/octet-stream";
    if (looksCsv) cb(null, true);
    else cb(new Error("Only .csv files are supported."));
  },
}).single("file");
