import pino from "pino";
import { env } from "../config/env.js";

/** Application logger. Pretty in dev is left to the caller (keeps deps slim). */
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  base: undefined,
});
