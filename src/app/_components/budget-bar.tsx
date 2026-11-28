import { computeUtilizationPercent } from "../format-purchase";
import { cn } from "./ui";

export type BudgetTone = "healthy" | "warning" | "danger";

export function budgetTone(percent: number, overspent: boolean): BudgetTone {
  if (overspent) return "danger";
  return percent >= 80 ? "warning" : "healthy";
}

const fillTone: Record<BudgetTone, string> = {
  healthy: "bg-ink-2",
  warning: "bg-warning-solid",
  danger: "bg-danger-solid",
};

const hatchTone: Record<BudgetTone, string> = {
  healthy: "text-ink-3/50",
  warning: "text-warning-solid/55",
  danger: "text-danger-solid/60",
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Bullet chart for a cost center: committed (solid) plus optional pending exposure (hatched)
 * against the allocation, with the 80% review threshold marked. Integer minor units only.
 */
export function BudgetBar({ allocatedMinor, committedMinor, pendingMinor = 0, size = "md" }: {
  allocatedMinor: number;
  committedMinor: number;
  pendingMinor?: number;
  size?: "sm" | "md" | "lg";
}) {
  const committedPct = computeUtilizationPercent(allocatedMinor, committedMinor);
  const projectedPct = computeUtilizationPercent(allocatedMinor, committedMinor + pendingMinor);
  const tone = budgetTone(committedPct, committedMinor > allocatedMinor);
  const projectedTone = budgetTone(projectedPct, committedMinor + pendingMinor > allocatedMinor);
  const pendingWidth = clamp(projectedPct) - clamp(committedPct);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2",
      )}
      aria-hidden="true"
    >
      <div className={cn("absolute inset-y-0 left-0 rounded-full", fillTone[tone])} style={{ width: `${clamp(committedPct)}%` }} />
      {pendingWidth > 0 && (
        <div
          className={cn("hatch absolute inset-y-0", hatchTone[projectedTone])}
          style={{ left: `${clamp(committedPct)}%`, width: `${pendingWidth}%` }}
        />
      )}
      <span className="absolute inset-y-0 left-[80%] w-px bg-surface" />
    </div>
  );
}
