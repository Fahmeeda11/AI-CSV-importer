import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "brand" | "amber" | "red" | "slate";
}

const tones: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function StatCard({ label, value, icon, tone = "slate" }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
          {value}
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}
