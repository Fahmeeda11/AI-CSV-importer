import { createApp } from "./app.js";
import { env, isAiConfigured } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, model: env.OPENAI_MODEL, aiConfigured: isAiConfigured() },
    `Backend listening on http://localhost:${env.PORT}`
  );
  if (!isAiConfigured()) {
    logger.warn("OPENAI_API_KEY is not set — /api/import will return 503 until it is provided.");
  }
});

const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutting down");
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
