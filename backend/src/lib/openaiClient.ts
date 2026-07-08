import OpenAI from "openai";
import { env, isAiConfigured } from "../config/env.js";

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "OPENAI_API_KEY is not set. Add it to the backend environment to enable AI extraction."
    );
    this.name = "AiNotConfiguredError";
  }
}

let client: OpenAI | null = null;

/** Lazily construct a singleton OpenAI client; throws if no key is configured. */
export function getOpenAI(): OpenAI {
  if (!isAiConfigured()) throw new AiNotConfiguredError();
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}
