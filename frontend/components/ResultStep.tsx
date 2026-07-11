"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Gauge,
  RotateCcw,
  SkipForward,
  Table2,
} from "lucide-react";
import { EditableRecordTable, type EditableRow } from "./EditableRecordTable";
import { StatCard } from "./StatCard";
import type { CrmField, ExtractedRecord, ImportSummary, SkippedRecord } from "@/lib/types";
import { downloadCsv, recordsToCsv } from "@/lib/csv";
import { cn } from "@/lib/cn";

interface ResultStepProps {
  records: ExtractedRecord[];
  skipped: SkippedRecord[];
  summary: ImportSummary;
  onReset: () => void;
}

export function ResultStep({ records, skipped, summary, onReset }: ResultStepProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  const [imported, setImported] = useState<EditableRow[]>(() =>
    records.map((r, i) => ({ id: `imp-${i}`, data: { ...r.data }, confidence: r.confidence }))
  );
  const [skippedRows, setSkippedRows] = useState<EditableRow[]>(() =>
    skipped.map((s) => ({
      id: `skp-${s.rowIndex}`,
      data: { ...s.data },
      confidence: s.confidence,
      reason: s.reason,
    }))
  );

  const editImported = (id: string, field: CrmField, value: string) =>
    setImported((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, data: { ...r.data, [field]: value }, edited: true } : r
      )
    );

  const editSkipped = (id: string, field: CrmField, value: string) =>
    setSkippedRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, data: { ...r.data, [field]: value }, edited: true } : r
      )
    );

  const recover = (id: string) => {
    const row = skippedRows.find((r) => r.id === id);
    if (!row) return;
    setSkippedRows((prev) => prev.filter((r) => r.id !== id));
    setImported((prev) => [...prev, { ...row, reason: undefined, edited: true }]);
    setTab("imported");
  };

  const avgConfidence = useMemo(
    () =>
      imported.length
        ? Math.round(imported.reduce((s, r) => s + r.confidence, 0) / imported.length)
        : 0,
    [imported]
  );

  const handleDownload = () =>
    downloadCsv(recordsToCsv(imported.map((r) => r.data)), "groweasy_crm_import.csv");

  return (
    <div className="animate-fade-in space-y-6">
      {/* Summary cards (live) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Rows" value={summary.totalRows} icon={<Table2 className="h-5 w-5" />} tone="slate" />
        <StatCard label="Imported" value={imported.length} icon={<CheckCircle2 className="h-5 w-5" />} tone="brand" />
        <StatCard label="Skipped" value={skippedRows.length} icon={<SkipForward className="h-5 w-5" />} tone="amber" />
        <StatCard label="Avg. Confidence" value={`${avgConfidence}%`} icon={<Gauge className="h-5 w-5" />} tone={avgConfidence >= 80 ? "brand" : avgConfidence >= 50 ? "amber" : "red"} />
      </div>

      {summary.failedBatches > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {summary.failedBatches} batch(es) failed and were listed as skipped — you can still recover those rows below.
        </div>
      )}

      <Legend />

      {/* Tabs + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <TabButton active={tab === "imported"} onClick={() => setTab("imported")}>
            Imported ({imported.length})
          </TabButton>
          <TabButton active={tab === "skipped"} onClick={() => setTab("skipped")}>
            Skipped ({skippedRows.length})
          </TabButton>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={imported.length === 0}
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

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Every field is editable — fix anything the AI got wrong before exporting. Status &amp;
        source are dropdowns. On the Skipped tab, add an email or mobile and click{" "}
        <span className="font-medium">Recover</span> to move a lead into the import. Downloads use
        your edits.
      </p>

      {tab === "imported" ? (
        <EditableRecordTable
          rows={imported}
          onEdit={editImported}
          emptyText="No records were imported. Check the Skipped tab — you can recover rows there."
        />
      ) : (
        <EditableRecordTable
          rows={skippedRows}
          onEdit={editSkipped}
          onRecover={recover}
          emptyText="No records were skipped — every row had an email or mobile."
        />
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Good Lead", cls: "bg-emerald-400" },
    { label: "Sale Done", cls: "bg-blue-400" },
    { label: "Did Not Connect", cls: "bg-amber-400" },
    { label: "Bad Lead", cls: "bg-red-400" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
      <span className="font-semibold text-slate-500 dark:text-slate-400">Status</span>
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className={cn("h-2.5 w-2.5 rounded-full", i.cls)} /> {i.label}
        </span>
      ))}
      <span className="ml-auto font-semibold text-slate-500 dark:text-slate-400">Confidence</span>
      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> High ≥80
      </span>
      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Med 50–79
      </span>
      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Low &lt;50
      </span>
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
