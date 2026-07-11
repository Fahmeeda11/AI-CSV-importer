import { cn } from "@/lib/cn";
import { confidenceTone } from "@/lib/ui";

/** A colored pill showing the AI's confidence (0–100) for a record. */
export function ConfidenceBadge({ score }: { score: number }) {
  const tone = confidenceTone(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone.classes
      )}
      title={`${tone.label} confidence`}
    >
      {score}%
    </span>
  );
}
