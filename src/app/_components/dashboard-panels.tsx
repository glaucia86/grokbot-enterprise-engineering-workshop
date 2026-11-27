import Link from "next/link";
import type { PurchaseRequest, PurchaseStatus } from "../../modules/procurement/domain/procurement";
import { formatUsd, formatUtcShortDate } from "../format-purchase";
import type { DashboardMetrics } from "./dashboard-metrics";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  HourglassMediumIcon,
  ScalesIcon,
  StampIcon,
  TrayIcon,
  WarningIcon,
} from "./icons";
import { card, cardHeader, cardTitle, chip, cn } from "./ui";

function QueueItem({ purchase, overLimit }: { purchase: PurchaseRequest; overLimit: boolean }) {
  const titleId = `queue-title-${purchase.id}`;
  return (
    <li className="group relative flex items-start gap-3 px-5 py-3 transition-colors duration-150 hover:bg-subtle">
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border",
          overLimit ? "border-warning-line bg-warning-soft text-warning" : "border-accent-line bg-accent-soft text-accent",
        )}
        aria-hidden="true"
      >
        {overLimit ? <WarningIcon size={15} /> : <StampIcon size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p id={titleId} className="truncate text-sm font-medium text-ink">{purchase.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
          <span className={chip} translate="no">{purchase.costCenterCode}</span>
          <span>Waiting since {formatUtcShortDate(purchase.createdAt)}</span>
          {overLimit && <span className="font-medium text-warning">Needs escalation</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-sm font-medium tabular-nums text-ink">{formatUsd(purchase.amountMinor)}</span>
        <Link
          href={"/requests/" + purchase.id}
          prefetch={false}
          aria-label={`Review ${formatUsd(purchase.amountMinor)} request in ${purchase.costCenterCode}`}
          aria-describedby={titleId}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent after:absolute after:inset-0 hover:text-accent-hover"
        >
          Review <ArrowRightIcon size={12} aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

export function DecisionQueue({ metrics, approvalLimitMinor }: { metrics: DashboardMetrics; approvalLimitMinor: number }) {
  const visible = metrics.queue.slice(0, 6);
  return (
    <section id="queue" className={card} aria-labelledby="queue-heading">
      <div className={cardHeader}>
        <div className="flex items-center gap-2">
          <StampIcon size={18} className="text-ink-3" aria-hidden="true" />
          <h2 id="queue-heading" className={cardTitle}>Decision queue</h2>
        </div>
        <span className="font-mono text-xs tabular-nums text-ink-3">{metrics.queue.length} pending</span>
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-line bg-line">
        <div className="bg-surface px-5 py-3">
          <dt className="text-xs text-ink-3">Within your limit</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-ink">
            {metrics.withinLimit.length} · {formatUsd(metrics.withinLimit.reduce((sum, p) => sum + p.amountMinor, 0))}
          </dd>
        </div>
        <div className="bg-surface px-5 py-3">
          <dt className="text-xs text-ink-3">Above {formatUsd(approvalLimitMinor)}</dt>
          <dd className={cn("mt-0.5 font-mono text-sm font-semibold tabular-nums", metrics.escalate.length ? "text-warning" : "text-ink")}>
            {metrics.escalate.length} · {formatUsd(metrics.escalate.reduce((sum, p) => sum + p.amountMinor, 0))}
          </dd>
        </div>
      </dl>

      {visible.length === 0 ? (
        <div className="grid justify-items-center gap-1 px-5 py-8 text-center">
          <TrayIcon size={28} weight="duotone" className="text-ink-3" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">Queue is clear</p>
          <p className="text-xs text-ink-3">New requests from your tenant appear here, oldest first.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((purchase) => (
            <QueueItem key={purchase.id} purchase={purchase} overLimit={purchase.amountMinor > approvalLimitMinor} />
          ))}
        </ul>
      )}
      {metrics.queue.length > visible.length && (
        <p className="border-t border-line px-5 py-2.5 text-xs text-ink-3">
          Showing the {visible.length} oldest of {metrics.queue.length}. Filter the request table for the rest.
        </p>
      )}
    </section>
  );
}

export function LedgerReconciliation({ metrics }: { metrics: DashboardMetrics }) {
  const balanced = metrics.reconciliationDeltaMinor === 0;
  return (
    <section className={card} aria-labelledby="reconciliation-heading">
      <div className={cardHeader}>
        <div className="flex items-center gap-2">
          <ScalesIcon size={18} className="text-ink-3" aria-hidden="true" />
          <h2 id="reconciliation-heading" className={cardTitle}>Ledger reconciliation</h2>
        </div>
        <span className={cn(chip, "border-transparent bg-transparent text-ink-3")}>INV-01</span>
      </div>
      <div className="grid gap-3 px-5 py-4">
        <dl className="grid gap-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">Committed budget</dt>
            <dd className="font-mono tabular-nums text-ink">{formatUsd(metrics.committedMinor)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-3">Approved requests</dt>
            <dd className="font-mono tabular-nums text-ink">{formatUsd(metrics.byStatus.APPROVED.amountMinor)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-2">
            <dt className="font-medium text-ink">Difference</dt>
            <dd className={cn("font-mono font-semibold tabular-nums", balanced ? "text-ink" : "text-danger")}>
              {formatUsd(metrics.reconciliationDeltaMinor)}
            </dd>
          </div>
        </dl>
        <p
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-[0.8125rem]",
            balanced ? "border-success-line bg-success-soft text-success" : "border-danger-line bg-danger-soft text-danger",
          )}
        >
          {balanced ? (
            <CheckCircleIcon size={16} className="mt-px shrink-0" aria-hidden="true" />
          ) : (
            <WarningIcon size={16} className="mt-px shrink-0" aria-hidden="true" />
          )}
          {balanced
            ? "Every committed dollar traces to exactly one approved request."
            : "Committed budget does not match approved requests. Inspect commitments for duplicates."}
        </p>
      </div>
    </section>
  );
}

const mixTone: Record<PurchaseStatus, { bar: string; dot: string; label: string }> = {
  APPROVED: { bar: "bg-success-solid", dot: "bg-success-solid", label: "Approved" },
  PENDING: { bar: "bg-warning-solid", dot: "bg-warning-solid", label: "Pending" },
  REJECTED: { bar: "bg-danger-solid", dot: "bg-danger-solid", label: "Rejected" },
};

export function DecisionMix({ metrics }: { metrics: DashboardMetrics }) {
  const statuses: PurchaseStatus[] = ["APPROVED", "PENDING", "REJECTED"];
  const total = statuses.reduce((sum, status) => sum + metrics.byStatus[status].count, 0);
  const decided = metrics.byStatus.APPROVED.count + metrics.byStatus.REJECTED.count;
  const approvalRate = decided === 0 ? null : Math.round((metrics.byStatus.APPROVED.count / decided) * 100);

  return (
    <section className={card} aria-labelledby="mix-heading">
      <div className={cardHeader}>
        <div className="flex items-center gap-2">
          <HourglassMediumIcon size={18} className="text-ink-3" aria-hidden="true" />
          <h2 id="mix-heading" className={cardTitle}>Decision mix</h2>
        </div>
        <span className="text-xs text-ink-3">
          {approvalRate === null ? "No decisions yet" : `${approvalRate}% approval rate`}
        </span>
      </div>
      <div className="grid gap-4 px-5 py-4">
        <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {total > 0 &&
            statuses.map((status) =>
              metrics.byStatus[status].count > 0 ? (
                <span
                  key={status}
                  className={mixTone[status].bar}
                  style={{ flexGrow: metrics.byStatus[status].count, flexBasis: 0 }}
                />
              ) : null,
            )}
        </div>
        <dl className="grid gap-2 text-sm">
          {statuses.map((status) => (
            <div key={status} className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className={cn("size-2 rounded-full", mixTone[status].dot)} aria-hidden="true" />
                {mixTone[status].label}
                <span className="font-mono text-xs tabular-nums text-ink-3">{metrics.byStatus[status].count}</span>
              </dt>
              <dd className="font-mono tabular-nums text-ink">{formatUsd(metrics.byStatus[status].amountMinor)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
