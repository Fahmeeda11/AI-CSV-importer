import { Router } from "express";
import { importCsv, importCsvStream } from "../controllers/importController.js";
import { uploadCsv } from "../middleware/upload.js";

export const importRouter = Router();

importRouter.post("/import", uploadCsv, importCsv);
importRouter.post("/import/stream", uploadCsv, importCsvStream);
