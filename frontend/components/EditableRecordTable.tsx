"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RotateCcwSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  type CrmField,
  type CrmRecord,
} from "@/lib/types";
import { prettifyField, sourceStyle, statusStyle } from "@/lib/ui";
import { ConfidenceBadge } from "./badges";

export interface EditableRow {
  id: string;
  data: CrmRecord;
  confidence: number;
  reason?: string;
  edited?: boolean;
}

interface EditableRecordTableProps {
  rows: EditableRow[];
  onEdit: (id: string, field: CrmField, value: string) => void;
  /** When provided, a "reason" column and a Recover action are shown. */
  onRecover?: (id: string) => void;
  emptyText?: string;
  maxHeight?: number;
}

const CONF_W = 96;
const REASON_W = 200;
const FIELD_W = 172;
const ACTION_W = 120;
const ROW_H = 52;


export function EditableRecordTable({
  rows,
  onEdit,
  onRecover,
  emptyText = "No records.",
  maxHeight = 460,
}: EditableRecordTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isSkipped = Boolean(onRecover);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  const template = [
    `${CONF_W}px`,
    ...(isSkipped ? [`${REASON_W}px`] : []),
    ...CRM_FIELDS.map(() => `${FIELD_W}px`),
    ...(isSkipped ? [`${ACTION_W}px`] : []),
  ].join(" ");
  const minWidth =
    CONF_W + (isSkipped ? REASON_W + ACTION_W : 0) + CRM_FIELDS.length * FIELD_W;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="scrollbar-thin overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      style={{ maxHeight }}
    >
      <div style={{ minWidth }}>
        {/* Header */}
        <div
          className="sticky top-0 z-10 grid border-b border-slate-200 bg-slate-100/95 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95"
          style={{ gridTemplateColumns: template }}
        >
          <HeaderCell>Confidence</HeaderCell>
          {isSkipped && <HeaderCell>Reason</HeaderCell>}
          {CRM_FIELDS.map((f) => (
            <HeaderCell key={f}>{prettifyField(f)}</HeaderCell>
          ))}
          {isSkipped && <HeaderCell>Action</HeaderCell>}
        </div>

        {/* Virtualized body */}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vItem) => {
            const row = rows[vItem.index]!;
            const canRecover = Boolean(
              row.data.email || row.data.mobile_without_country_code
            );
            return (
              <div
                key={row.id}
                className={cn(
                  "grid items-center border-b border-slate-100 dark:border-slate-800/70",
                  row.edited && "bg-brand-50/40 dark:bg-brand-900/10"
                )}
                style={{
                  gridTemplateColumns: template,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vItem.size,
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                {/* Confidence */}
                <div className="flex items-center px-3">
                  <ConfidenceBadge score={row.confidence} />
                </div>

                {/* Reason (skipped mode) */}
                {isSkipped && (
                  <div
                    className="truncate px-3 text-xs text-amber-700 dark:text-amber-400"
                    title={row.reason}
                  >
                    {row.reason}
                  </div>
                )}

                {/* Editable CRM fields */}
                {CRM_FIELDS.map((field) => (
                  <div key={field} className="px-2">
                    {field === "crm_status" ? (
                      <EnumSelect
                        value={row.data[field]}
                        options={CRM_STATUS_VALUES}
                        styleFor={statusStyle}
                        onChange={(v) => onEdit(row.id, field, v)}
                      />
                    ) : field === "data_source" ? (
                      <EnumSelect
                        value={row.data[field]}
                        options={DATA_SOURCE_VALUES}
                        styleFor={sourceStyle}
                        onChange={(v) => onEdit(row.id, field, v)}
                      />
                    ) : (
                      <input
                        value={row.data[field]}
                        onChange={(e) => onEdit(row.id, field, e.target.value)}
                        placeholder="—"
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-brand-400 focus:bg-white dark:text-slate-200 dark:placeholder:text-slate-600 dark:hover:border-slate-700 dark:focus:bg-slate-950"
                      />
                    )}
                  </div>
                ))}

                {/* Recover action (skipped mode) */}
                {isSkipped && (
                  <div className="px-2">
                    <button
                      type="button"
                      disabled={!canRecover}
                      onClick={() => onRecover?.(row.id)}
                      title={
                        canRecover
                          ? "Add this lead to the imported set"
                          : "Add an email or mobile first"
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcwSquare className="h-3.5 w-3.5" /> Recover
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="truncate px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
      {children}
    </div>
  );
}

function EnumSelect({
  value,
  options,
  styleFor,
  onChange,
}: {
  value: string;
  options: readonly string[];
  styleFor: (v: string) => string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full cursor-pointer rounded-md border px-2 py-1 text-xs font-medium outline-none transition focus:ring-2 focus:ring-brand-400/40",
        styleFor(value)
      )}
    >
      <option value="">— blank —</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
