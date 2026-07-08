"use client";

import { FileSpreadsheet, Sparkles, X } from "lucide-react";
import { DataTable, type Column } from "./DataTable";
import type { ParsedCsv } from "@/lib/types";

interface PreviewStepProps {
  parsed: ParsedCsv;
  onConfirm: () => void;
  onCancel: () => void;
  aiReady: boolean;
}

export function PreviewStep({ parsed, onConfirm, onCancel, aiReady }: PreviewStepProps) {
  const columns: Column[] = parsed.headers.map((h) => ({ key: h, label: h }));

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{parsed.fileName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {parsed.rows.length.toLocaleString()} rows · {parsed.headers.length} columns detected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!aiReady}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
            title={aiReady ? "Send to AI for CRM mapping" : "Backend AI is not configured"}
          >
            <Sparkles className="h-4 w-4" /> Confirm &amp; Import
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-2.5 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-200">
        This is a raw preview of your file. No AI processing happens until you confirm.
      </div>

      <DataTable columns={columns} rows={parsed.rows} maxHeight={460} />
    </div>
  );
}
