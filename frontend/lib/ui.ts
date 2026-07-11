import type { CrmField } from "./types";

/** Friendly column labels for CRM fields. */
const FIELD_LABELS: Partial<Record<CrmField, string>> = {
  created_at: "Created At",
  mobile_without_country_code: "Mobile",
  country_code: "Code",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession",
};

export function prettifyField(field: string): string {
  return (
    FIELD_LABELS[field as CrmField] ??
    field
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

/** Tailwind classes for a CRM status badge / colored select. */
export function statusStyle(value: string): string {
  switch (value) {
    case "GOOD_LEAD_FOLLOW_UP":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800";
    case "SALE_DONE":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800";
    case "DID_NOT_CONNECT":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800";
    case "BAD_LEAD":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
}

/** Tailwind classes for a data-source badge / colored select. */
export function sourceStyle(value: string): string {
  return value
    ? "bg-brand-100 text-brand-800 border-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-800"
    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
}

export type ConfidenceTone = { label: string; classes: string };

/** Confidence → color bucket. High ≥80, Medium 50–79, Low <50. */
export function confidenceTone(score: number): ConfidenceTone {
  if (score >= 80) {
    return {
      label: "High",
      classes:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    };
  }
  if (score >= 50) {
    return {
      label: "Medium",
      classes: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    };
  }
  return {
    label: "Low",
    classes: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  };
}
