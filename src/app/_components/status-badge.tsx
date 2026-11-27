import type { PurchaseStatus } from "../../modules/procurement/domain/procurement";
import { cn, statusBadge, statusTone } from "./ui";

export function StatusBadge({ status, live = false, className }: {
  status: PurchaseStatus;
  live?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(statusBadge, statusTone[status], className)} role={live ? "status" : undefined}>
      <span className={cn("size-1.5 rounded-full bg-current", status === "PENDING" && "motion-safe:animate-pulse")} aria-hidden="true" />
      {status}
    </span>
  );
}
