import Link from "next/link";
import type { PurchaseRequest } from "../../modules/procurement/domain/procurement";
import { formatUsd, formatUtcShortDate } from "../format-purchase";
import { integrityStatus, type DashboardMetrics, type IntegrityStatus } from "./dashboard-metrics";
import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  HourglassMediumIcon,
  PencilSimpleLineIcon,
  ScalesIcon,
  StampIcon,
  TrayIcon,
  WarningIcon,
} from "./icons";
import { button, card, cardHeader, cardTitle, chip, cn } from "./ui";

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

function integrityMessage(status: IntegrityStatus) {
  if (status.kind === "over-allocation") {
    return status.centers
      .map((center) => `${center.code} has ${formatUsd(center.committedMinor)} committed against ${formatUsd(center.allocatedMinor)} allocated.`)
      .join(" ");
  }
  if (status.kind === "unreconciled") {
    return `Committed budget differs from approved requests in ${status.centers.map((center) => center.code).join(", ")}. Inspect its commitments.`;
  }
  return "Each cost center is within its allocation, and its committed budget equals its approved requests.";
}

export function LedgerReconciliation({ metrics }: { metrics: DashboardMetrics }) {
  const status = integrityStatus(metrics);
  const exception = status.kind !== "clear";
  return (
    <section className={card} aria-labelledby="reconciliation-heading">
      <div className={cardHeader}>
        <div className="flex items-center gap-2">
          <ScalesIcon size={18} className="text-ink-3" aria-hidden="true" />
          <h2 id="reconciliation-heading" className={cardTitle}>Ledger reconciliation</h2>
        </div>
        <span className="text-xs text-ink-3">Per cost center</span>
      </div>
      <div className="grid gap-3 px-5 py-4">
        <table className="w-full text-sm">
          <caption className="sr-only">Committed budget compared with approved requests and allocation, per cost center</caption>
          <thead>
            <tr className="text-left text-xs text-ink-3">
              <th scope="col" className="pb-1.5 font-medium">Cost center</th>
              <th scope="col" className="pb-1.5 text-right font-medium">Committed</th>
              <th scope="col" className="pb-1.5 text-right font-medium">Approved</th>
            </tr>
          </thead>
          <tbody>
            {metrics.integrity.map((center) => {
              const flagged = center.overAllocationMinor > 0 || center.reconciliationDeltaMinor !== 0;
              return (
                <tr key={center.id} className="border-t border-line">
                  <th scope="row" className="py-1.5 text-left font-normal">
                    <span className={chip} translate="no">{center.code}</span>
                  </th>
                  <td className={cn("py-1.5 text-right font-mono tabular-nums", center.overAllocationMinor > 0 ? "font-semibold text-danger" : "text-ink")}>
                    {formatUsd(center.committedMinor)}
                  </td>
                  <td className={cn("py-1.5 text-right font-mono tabular-nums", flagged ? "text-danger" : "text-ink")}>
                    {formatUsd(center.approvedMinor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-[0.8125rem]",
            exception ? "border-danger-line bg-danger-soft text-danger" : "border-line bg-subtle text-ink-2",
          )}
          role={exception ? "alert" : undefined}
        >
          {exception && <WarningIcon size={16} className="mt-px shrink-0" aria-hidden="true" />}
          <span>
            {integrityMessage(status)}
            <span className="mt-1 block text-xs opacity-80">Checks INV-01 from current ledger balances when this page loaded.</span>
          </span>
        </p>
      </div>
    </section>
  );
}

type Step = {
  tone: "accent" | "success" | "danger";
  icon: ReactNode;
  title: string;
  detail: string;
  action?: { href: string; label: string };
};

function nextStepFor(role: string, metrics: DashboardMetrics): Step {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  if (role === "APPROVER") {
    const oldest = metrics.queue[0];
    if (!oldest) {
      return {
        tone: "success",
        icon: <CheckCircleIcon size={20} />,
        title: "Your queue is clear",
        detail: "New requests from your tenant land in the decision queue, oldest first.",
      };
    }
    const escalate = metrics.escalate.length ? ` · ${plural(metrics.escalate.length, "request")} above your limit` : "";
    return {
      tone: "accent",
      icon: <StampIcon size={20} />,
      title: `${plural(metrics.queue.length, "request")} waiting for your decision`,
      detail: `Oldest: ${oldest.title} · ${formatUsd(oldest.amountMinor)}${escalate}`,
      action: { href: "/requests/" + oldest.id, label: "Review oldest" },
    };
  }
  if (role === "AUDITOR") {
    const status = integrityStatus(metrics);
    if (status.kind === "clear") {
      return {
        tone: "accent",
        icon: <ScalesIcon size={20} />,
        title: "Every cost center is within allocation and reconciled",
        detail: "Open any request to trace its audit trail.",
        action: { href: "#requests", label: "Inspect requests" },
      };
    }
    return {
      tone: "danger",
      icon: <WarningIcon size={20} />,
      title: status.kind === "over-allocation"
        ? `${plural(status.centers.length, "cost center")} over allocation`
        : "Committed budget differs from approved requests",
      detail: integrityMessage(status),
      action: { href: "#budgets", label: "Inspect ledger" },
    };
  }
  const pending = metrics.byStatus.PENDING.count;
  return pending
    ? {
        tone: "accent",
        icon: <HourglassMediumIcon size={20} />,
        title: `${plural(pending, "request")} awaiting a decision`,
        detail: "Approvers in your tenant see them immediately. Track them below or raise another one.",
        action: { href: "#new-request", label: "New request" },
      }
    : {
        tone: "accent",
        icon: <PencilSimpleLineIcon size={20} />,
        title: "Start with a purchase request",
        detail: "Pick a cost center, describe the need, and submit. The amount is stored in exact cents.",
        action: { href: "#new-request", label: "New request" },
      };
}

const stepTone = {
  accent: "border-accent-line bg-accent-soft text-accent",
  success: "border-success-line bg-success-soft text-success",
  danger: "border-danger-line bg-danger-soft text-danger",
} as const;

export function NextStep({ role, metrics }: { role: string; metrics: DashboardMetrics }) {
  const step = nextStepFor(role, metrics);
  return (
    <section className={cn(card, "mt-6 flex flex-wrap items-center gap-4 px-5 py-4")} aria-label="Next step">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg border", stepTone[step.tone])} aria-hidden="true">
        {step.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{step.title}</p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-ink-3">{step.detail}</p>
      </div>
      {step.action && (
        <Link href={step.action.href} prefetch={false} className={cn(button.secondary, "shrink-0")} data-magnetic>
          {step.action.label}
          <ArrowRightIcon size={15} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
