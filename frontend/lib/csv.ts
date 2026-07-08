import Papa from "papaparse";
import { CRM_FIELDS, type CrmRecord, type ParsedCsv, type RawRow } from "./types";

export class CsvValidationError extends Error {}

/**
 * Parse a CSV File client-side for the PREVIEW step (no AI). Uses PapaParse with
 * header detection; returns headers in original order plus row objects.
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h, i) => (h && h.trim() ? h.trim() : `column_${i + 1}`),
      complete: (result) => {
        const rows = (result.data ?? []).filter((row) =>
          Object.values(row).some((v) => v != null && String(v).trim() !== "")
        );
        if (rows.length === 0) {
          reject(new CsvValidationError("No data rows were found in this CSV."));
          return;
        }
        const headers = result.meta.fields ?? Object.keys(rows[0] ?? {});
        resolve({ headers, rows, fileName: file.name });
      },
      error: (err) => reject(new CsvValidationError(err.message)),
    });
  });
}

/** Build a downloadable CRM CSV string from extracted records. */
export function recordsToCsv(records: CrmRecord[]): string {
  return Papa.unparse(
    {
      fields: [...CRM_FIELDS],
      data: records.map((r) => CRM_FIELDS.map((f) => r[f] ?? "")),
    },
    { quotes: true }
  );
}

/** Trigger a browser download of the given CSV content. */
export function downloadCsv(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
