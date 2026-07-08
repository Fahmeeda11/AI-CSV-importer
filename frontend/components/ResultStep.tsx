"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, RotateCcw, SkipForward, Table2, AlertTriangle } from "lucide-react";
import { DataTable, type Column } from "./DataTable";
import { StatCard } from "./StatCard";
import { CRM_FIELDS, type CrmRecord, type ImportSummary, type SkippedRecord } from "@/lib/types";
import { downloadCsv, recordsToCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";

interface ResultStepProps {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  summary: ImportSummary;
  onReset: () => void;
}

const FIELD_LABELS: Partial<Record<string, string>> = {
  created_at: "Created At",
  mobile_without_country_code: "Mobile",
  country_code: "Code",
  crm_status: "CRM Status",
  crm_note: "CRM Note",
  data_source: "Data Source",
  possession_time: "Possession",
};

const EMPHASIZE = ["name", "email", "mobile_without_country_code", "crm_status"];

function prettify(field: string): string {
  return (
    FIELD_LABELS[field] ??
    field
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function ResultStep({ records, skipped, summary, onReset }: ResultStepProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  const crmColumns: Column[] = CRM_FIELDS.map((f) => ({ key: f, label: prettify(f) }));

  const { skippedColumns, skippedRows } = useMemo(() => {
    const rawKeys = new Set<string>();
    skipped.forEach((s) => Object.keys(s.raw).forEach((k) => rawKeys.add(k)));
    const columns: Column[] = [
      { key: "__row", label: "Row" },
      { key: "__reason", label: "Reason" },
      ...[...rawKeys].map((k) => ({ key: k, label: k })),
    ];
    const rows = skipped.map((s) => ({
      __row: String(s.rowIndex + 1),
      __reason: s.reason,
      ...s.raw,
    }));
    return { skippedColumns: columns, skippedRows: rows };
  }, [skipped]);

  const handleDownload = () => {
    downloadCsv(recordsToCsv(records), "groweasy_crm_import.csv");
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Rows" value={summary.totalRows} icon={<Table2 className="h-5 w-5" />} tone="slate" />
        <StatCard label="Imported" value={summary.imported} icon={<CheckCircle2 className="h-5 w-5" />} tone="brand" />
        <StatCard label="Skipped" value={summary.skipped} icon={<SkipForward className="h-5 w-5" />} tone="amber" />
        <StatCard
          label="Failed Batches"
          value={summary.failedBatches}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={summary.failedBatches > 0 ? "red" : "slate"}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <TabButton active={tab === "imported"} onClick={() => setTab("imported")}>
            Imported ({records.length})
          </TabButton>
          <TabButton active={tab === "skipped"} onClick={() => setTab("skipped")}>
            Skipped ({skipped.length})
          </TabButton>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Download CRM CSV
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" /> Import another
          </button>
        </div>
      </div>

      {tab === "imported" ? (
        <DataTable
          columns={crmColumns}
          rows={records}
          emphasize={EMPHASIZE}
          maxHeight={480}
          emptyText="No records were successfully imported."
        />
      ) : (
        <DataTable
          columns={skippedColumns}
          rows={skippedRows}
          emphasize={["__reason"]}
          maxHeight={480}
          emptyText="No records were skipped — every row had an email or mobile."
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}
