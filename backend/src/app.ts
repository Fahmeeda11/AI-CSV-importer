import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { allowedOrigins, env, isAiConfigured } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { importRouter } from "./routes/import.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

/** Assemble the Express application (kept separate from `listen` for testing). */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));
  app.use(cors({ origin: allowedOrigins }));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", aiConfigured: isAiConfigured(), model: env.OPENAI_MODEL });
  });

  app.use("/api", importRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
