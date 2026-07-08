"use client";

import { Loader2 } from "lucide-react";
import type { ImportState } from "@/lib/reducer";

interface ProcessingStepProps {
  state: ImportState;
}

export function ProcessingStep({ state }: ProcessingStepProps) {
  const { totalBatches, batchesDone, records, skipped } = state;
  const pct = totalBatches > 0 ? Math.round((batchesDone / totalBatches) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            Mapping your leads with AI…
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {totalBatches > 0
              ? `Batch ${Math.min(batchesDone + 1, totalBatches)} of ${totalBatches}`
              : "Preparing batches…"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Processing</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <LiveCount label="Mapped so far" value={records.length} tone="brand" />
        <LiveCount label="Skipped so far" value={skipped.length} tone="amber" />
      </div>

      <p className="text-sm text-slate-400 dark:text-slate-500">
        Records stream in as each batch finishes — no need to wait for the whole file.
      </p>
    </div>
  );
}

function LiveCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "amber";
}) {
  const color =
    tone === "brand"
      ? "text-brand-600 dark:text-brand-400"
      : "text-amber-600 dark:text-amber-400";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
