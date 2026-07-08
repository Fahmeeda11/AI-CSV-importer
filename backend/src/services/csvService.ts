import { parse } from "csv-parse/sync";
import type { RawRow } from "../domain/crm.js";

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

/**
 * Parse a CSV buffer into an array of raw rows keyed by their original header
 * names. Deliberately tolerant: handles quoted fields, embedded commas/newlines,
 * a UTF-8 BOM, ragged/short rows, and blank lines. We do NOT assume any fixed
 * column names — that mapping is the AI's job downstream.
 */
export function parseCsv(buffer: Buffer): RawRow[] {
  const text = stripBom(buffer.toString("utf8"));

  if (!text.trim()) {
    throw new CsvParseError("The uploaded file is empty.");
  }

  let rows: RawRow[];
  try {
    rows = parse(text, {
      columns: (header: string[]) => normalizeHeaders(header),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // tolerate ragged rows
      relax_quotes: true,
      bom: true,
    }) as RawRow[];
  } catch (err) {
    throw new CsvParseError(
      `Could not parse CSV: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Drop rows where every value is blank.
  const nonEmpty = rows.filter((row) =>
    Object.values(row).some((v) => v != null && String(v).trim() !== "")
  );

  if (nonEmpty.length === 0) {
    throw new CsvParseError("No data rows found in the CSV.");
  }

  return nonEmpty;
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/**
 * Ensure header names are usable and unique. Empty headers become `column_N`;
 * duplicates get a numeric suffix so no data is silently overwritten.
 */
function normalizeHeaders(header: string[]): string[] {
  const seen = new Map<string, number>();
  return header.map((raw, i) => {
    let name = (raw ?? "").trim();
    if (!name) name = `column_${i + 1}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return count === 0 ? name : `${name}_${count + 1}`;
  });
}
