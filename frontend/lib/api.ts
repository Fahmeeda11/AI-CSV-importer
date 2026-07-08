import type { StreamEvent } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * POST the CSV file to the streaming import endpoint and yield decoded NDJSON
 * events as they arrive. Uses the fetch ReadableStream body so results and
 * progress render incrementally.
 */
export async function* importCsvStream(
  file: File,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/import/stream`, {
    method: "POST",
    body: form,
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Import failed (HTTP ${res.status}).`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) yield JSON.parse(line) as StreamEvent;
    }
  }

  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as StreamEvent;
}

/** Health probe used to warn the user if the backend/AI is unavailable. */
export async function checkHealth(): Promise<{ status: string; aiConfigured: boolean } | null> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return null;
    return (await res.json()) as { status: string; aiConfigured: boolean };
  } catch {
    return null;
  }
}
