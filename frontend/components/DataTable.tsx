"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";

export interface Column {
  key: string;
  label: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column[];
  rows: T[];
  /** Max height of the scroll viewport. */
  maxHeight?: number;
  /** Columns to visually emphasise (e.g. key CRM fields). */
  emphasize?: string[];
  emptyText?: string;
  minColumnWidth?: number;
  rowHeight?: number;
}

/**
 * Reusable data table with sticky headers, horizontal + vertical scrolling, and
 * row virtualization (handles large CSVs without rendering thousands of nodes).
 * Header and body share one CSS-grid template so columns always stay aligned.
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  maxHeight = 420,
  emphasize = [],
  emptyText = "No rows to display.",
  minColumnWidth = 180,
  rowHeight = 44,
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const emphasized = new Set(emphasize);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const gridTemplateColumns = `repeat(${columns.length}, minmax(${minColumnWidth}px, 1fr))`;
  const minWidth = columns.length * minColumnWidth;

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
          style={{ gridTemplateColumns }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "truncate px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300",
                emphasized.has(col.key) && "text-brand-700 dark:text-brand-300"
              )}
              title={col.label}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Virtualized body */}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vItem) => {
            const row = rows[vItem.index] as Record<string, unknown>;
            return (
              <div
                key={vItem.key}
                className="grid border-b border-slate-100 text-sm even:bg-slate-50/50 hover:bg-brand-50/50 dark:border-slate-800/70 dark:even:bg-slate-800/30 dark:hover:bg-slate-800/60"
                style={{
                  gridTemplateColumns,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vItem.size,
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                {columns.map((col) => {
                  const value = row[col.key];
                  const text = value == null ? "" : String(value);
                  return (
                    <div
                      key={col.key}
                      className={cn(
                        "flex items-center truncate px-3 text-slate-700 dark:text-slate-200",
                        !text && "text-slate-300 dark:text-slate-600",
                        emphasized.has(col.key) && text && "font-medium text-slate-900 dark:text-white"
                      )}
                      title={text}
                    >
                      {text || "—"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
