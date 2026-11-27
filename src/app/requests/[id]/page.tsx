import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import type { PurchaseStatus } from "../../../modules/procurement/domain/procurement";
import { listLabIdentities, readLabSession } from "../../../server/auth/lab-session";
import { parseVariant, prototypesEnabled } from "../../_prototype/flag";
import { nextPendingFor } from "../../_prototype/load";
import { ReviewA } from "../../_prototype/review-a.prototype";
import { ReviewB } from "../../_prototype/review-b.prototype";
import { ReviewC } from "../../_prototype/review-c.prototype";
import { PrototypeSwitcher } from "../../_prototype/switcher";
import { requests } from "../../../server/procurement/requests";
import { AppShell } from "../../_components/app-shell";
import { BudgetBar } from "../../_components/budget-bar";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  FileTextIcon,
  HourglassMediumIcon,
  ReceiptIcon,
  SealCheckIcon,
  StampIcon,
  WalletIcon,
  WarningIcon,
  XCircleIcon,
} from "../../_components/icons";
import { StatusBadge } from "../../_components/status-badge";
import { card, cardHeader, cardTitle, chip, cn, eyebrow } from "../../_components/ui";
import { computeUtilizationPercent, formatUsd, formatUtcTimestamp } from "../../format-purchase";
import { DecisionForm } from "./decision-form";

type StepState = "done" | "current" | "upcoming" | "approved" | "rejected";

function workflowSteps(status: PurchaseStatus): { label: string; hint: string; state: StepState }[] {
  const decided = status !== "PENDING";
  return [
    { label: "Submitted", hint: "Request recorded", state: "done" },
    { label: "Decision", hint: decided ? "Decision recorded" : "Awaiting approver", state: decided ? "done" : "current" },
    {
      label: status === "REJECTED" ? "Rejected" : status === "APPROVED" ? "Approved" : "Outcome",
      hint: status === "APPROVED" ? "Budget committed" : status === "REJECTED" ? "No budget impact" : "Terminal state",
      state: status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "upcoming",
    },
  ];
}

const stepMarker: Record<StepState, string> = {
  done: "border-accent-solid bg-accent-solid text-white",
  current: "border-warning-solid bg-warning-soft text-warning",
  upcoming: "border-line-strong bg-surface text-ink-3",
  approved: "border-success-solid bg-success-solid text-white",
  rejected: "border-danger-solid bg-danger-solid text-white",
};

function StepIcon({ state }: { state: StepState }) {
  if (state === "rejected") return <XCircleIcon size={15} weight="bold" />;
  if (state === "current" || state === "upcoming") return <HourglassMediumIcon size={14} weight="bold" />;
  return <CheckCircleIcon size={15} weight="bold" />;
}

const auditTone = {
  CREATED: { marker: "border-accent-line bg-accent-soft text-accent", icon: <FileTextIcon size={14} /> },
  APPROVED: { marker: "border-success-line bg-success-soft text-success", icon: <SealCheckIcon size={14} /> },
  REJECTED: { marker: "border-danger-line bg-danger-soft text-danger", icon: <XCircleIcon size={14} /> },
} as const;

export default async function RequestDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readLabSession();
  if (!session) redirect("/");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [detail, audit] = await Promise.all([
    requests.detail(session, id.data),
    session.role === "REQUESTER" ? Promise.resolve(undefined) : requests.audit(session, id.data),
  ]);
  if (!detail) notFound();

  const prototypes = prototypesEnabled();
  const variant = prototypes ? parseVariant((await searchParams).variant) : "0";
  const switcher = prototypes ? <PrototypeSwitcher current={variant} /> : null;
  if (variant !== "0") {
    const [identities, nextPending] = await Promise.all([listLabIdentities(), nextPendingFor(session, detail.purchase.id)]);
    const data = { variant, session, identities: [...identities], detail, events: audit?.kind === "found" ? audit.events : null, nextPending, asOf: new Date() };
    return (
      <>
        {variant === "A" ? <ReviewA data={data} /> : variant === "B" ? <ReviewB data={data} /> : <ReviewC data={data} />}
        {switcher}
      </>
    );
  }

  const { purchase, costCenter, commitment, canDecide, canApprove } = detail;
  const utilPct = computeUtilizationPercent(costCenter.allocatedBudgetMinor, costCenter.committedBudgetMinor);
  const overspent = costCenter.availableBudgetMinor < 0;
  const projectedRemaining = costCenter.availableBudgetMinor - purchase.amountMinor;
  const projectedPct = computeUtilizationPercent(
    costCenter.allocatedBudgetMinor,
    costCenter.committedBudgetMinor + purchase.amountMinor,
  );
  const pending = purchase.status === "PENDING";
  const steps = workflowSteps(purchase.status);

  return (
    <>
    <AppShell session={session} section="detail">
      <Link
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg pr-3 text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-accent"
        href="/"
        prefetch={false}
      >
        <ArrowLeftIcon size={16} aria-hidden="true" />
        Back to purchase requests
      </Link>

      <div className="mt-3 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <article className={card}>
            <header className="flex flex-wrap items-start justify-between gap-4 px-6 pt-5 pb-4">
              <div className="min-w-0 flex-1">
                <p className={cn(eyebrow, "flex flex-wrap items-center gap-2")}>
                  Purchase request
                  <span className={cn(chip, "normal-case tracking-normal")} translate="no">{purchase.id}</span>
                </p>
                <h1 className="mt-2 text-[1.625rem] leading-tight font-semibold tracking-[-0.025em] break-words text-ink">
                  {purchase.title}
                </h1>
              </div>
              <StatusBadge status={purchase.status} live className="px-2.5 py-1 text-xs" />
            </header>

            <ol className="mx-6 grid grid-cols-3 gap-2 rounded-lg border border-line bg-subtle p-3" aria-label="Workflow progress">
              {steps.map((step, index) => (
                <li key={step.label} className="flex min-w-0 items-center gap-2.5">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border", stepMarker[step.state])} aria-hidden="true">
                    <StepIcon state={step.state} />
                  </span>
                  <span className="grid min-w-0 leading-tight">
                    <span className="text-[0.8125rem] font-semibold text-ink">{step.label}</span>
                    <span className="truncate text-xs text-ink-3">{step.hint}</span>
                  </span>
                  {index < steps.length - 1 && (
                    <span
                      className={cn("hidden h-px min-w-4 flex-1 sm:block", step.state === "done" ? "bg-accent-solid" : "bg-line-strong")}
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>

            <dl className="mt-5 grid grid-cols-1 gap-px border-y border-line bg-line sm:grid-cols-2 2xl:grid-cols-4">
              <div className="bg-surface px-6 py-4">
                <dt className="text-xs font-medium text-ink-3">Amount</dt>
                <dd className="mt-1 font-mono text-[1.625rem] leading-tight font-semibold tracking-[-0.03em] tabular-nums text-ink">
                  {formatUsd(purchase.amountMinor)}
                </dd>
              </div>
              <div className="bg-surface px-6 py-4">
                <dt className="text-xs font-medium text-ink-3">Cost center</dt>
                <dd className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink">
                  <span className={chip} translate="no">{costCenter.code}</span>
                  {costCenter.name}
                </dd>
              </div>
              <div className="bg-surface px-6 py-4">
                <dt className="text-xs font-medium text-ink-3">Submitted</dt>
                <dd className="mt-1.5 font-mono text-sm tabular-nums text-ink">
                  <time dateTime={purchase.createdAt.toISOString()}>{formatUtcTimestamp(purchase.createdAt)}</time>
                </dd>
              </div>
              <div className="bg-surface px-6 py-4">
                <dt className="text-xs font-medium text-ink-3">Tenant</dt>
                <dd className="mt-1.5 text-sm text-ink" translate="no">{session.tenantName}</dd>
              </div>
            </dl>

            <div className="px-6 py-5">
              <h2 className="text-xs font-medium text-ink-3">Justification</h2>
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed whitespace-pre-wrap break-words text-ink-2">
                {purchase.justification}
              </p>
            </div>
          </article>

          {audit?.kind === "found" && (
            <section className={card} aria-labelledby="audit-heading">
              <div className={cardHeader}>
                <div className="flex items-center gap-2">
                  <ClockCounterClockwiseIcon size={18} className="text-ink-3" aria-hidden="true" />
                  <h2 id="audit-heading" className={cardTitle}>Audit trail</h2>
                </div>
                <span className="text-xs text-ink-3">{audit.events.length} durable events</span>
              </div>
              <ol className="grid gap-0 px-6 py-5">
                {audit.events.map((event, index) => {
                  const tone = auditTone[event.type];
                  const last = index === audit.events.length - 1;
                  return (
                    <li key={event.id} className={cn("relative flex gap-3.5", !last && "pb-5")}>
                      {!last && <span className="absolute top-8 bottom-0 left-[0.9375rem] w-px bg-line-strong" aria-hidden="true" />}
                      <span className={cn("relative grid size-[1.875rem] shrink-0 place-items-center rounded-full border", tone.marker)} aria-hidden="true">
                        {tone.icon}
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                          <strong className="font-semibold tracking-[0.02em] text-ink">{event.type}</strong>
                          <span className="text-ink-2">· {event.actorName}</span>
                          <time className="ml-auto font-mono text-xs tabular-nums text-ink-3" dateTime={event.occurredAt.toISOString()}>
                            {formatUtcTimestamp(event.occurredAt)}
                          </time>
                        </div>
                        {event.reason && (
                          <p className="mt-2 rounded-lg border border-line border-l-2 border-l-danger-solid bg-subtle px-3 py-2 text-sm whitespace-pre-wrap break-words text-ink-2">
                            {event.reason}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        <aside className="grid min-w-0 grid-cols-1 gap-6 lg:sticky lg:top-8" aria-label="Budget and approval controls">
          <section className={card} aria-labelledby="budget-context-heading">
            <div className={cardHeader}>
              <div className="flex items-center gap-2">
                <WalletIcon size={18} className="text-ink-3" aria-hidden="true" />
                <h2 id="budget-context-heading" className={cardTitle}>Cost center ledger</h2>
              </div>
              <span className={chip} translate="no">{costCenter.code}</span>
            </div>
            <div className="grid gap-4 px-5 py-4">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{costCenter.name}</p>
                  <p className="text-xs text-ink-3">
                    <span className="font-mono tabular-nums">{utilPct}% used</span>
                    {pending && <> · <span className="font-mono tabular-nums">{projectedPct}%</span> if approved</>}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-2xl font-semibold tracking-[-0.03em] tabular-nums",
                    overspent ? "text-danger" : utilPct >= 80 ? "text-warning" : "text-ink",
                  )}
                >
                  {utilPct}%
                </span>
              </div>
              <BudgetBar
                allocatedMinor={costCenter.allocatedBudgetMinor}
                committedMinor={costCenter.committedBudgetMinor}
                pendingMinor={pending ? purchase.amountMinor : 0}
                size="lg"
              />
              <dl className="grid text-sm">
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="text-ink-3">Allocated budget</dt>
                  <dd className="font-mono tabular-nums text-ink">{formatUsd(costCenter.allocatedBudgetMinor)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <dt className="text-ink-3">Committed budget</dt>
                  <dd className="font-mono tabular-nums text-ink">{formatUsd(costCenter.committedBudgetMinor)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 pt-2">
                  <dt className="font-medium text-ink">Available budget</dt>
                  <dd className={cn("font-mono font-semibold tabular-nums", overspent ? "text-danger" : "text-ink")}>
                    {formatUsd(costCenter.availableBudgetMinor)}
                  </dd>
                </div>
                {pending && (
                  <div className="flex items-baseline justify-between gap-3 py-1.5">
                    <dt className="text-ink-2">Projected if approved ({projectedPct}%)</dt>
                    <dd className={cn("font-mono font-semibold tabular-nums", projectedRemaining < 0 ? "text-danger" : "text-ink")}>
                      {formatUsd(projectedRemaining)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          {commitment && (
            <section className={cn(card, "border-success-line")} aria-labelledby="commitment-heading">
              <div className={cardHeader}>
                <div className="flex items-center gap-2">
                  <ReceiptIcon size={18} className="text-success" aria-hidden="true" />
                  <h2 id="commitment-heading" className={cardTitle}>Financial commitment</h2>
                </div>
                <span className="rotate-[-3deg] rounded-md border-[1.5px] border-success-solid px-2 py-0.5 text-[0.625rem] font-bold tracking-[0.14em] text-success uppercase">
                  Committed
                </span>
              </div>
              <dl className="grid gap-3 px-5 py-4 text-sm">
                <div>
                  <dt className="text-xs font-medium text-ink-3">Commitment ID</dt>
                  <dd className="mt-0.5 font-mono text-[0.8125rem] break-all text-ink" translate="no">{commitment.id}</dd>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <dt className="text-xs font-medium text-ink-3">Committed by</dt>
                    <dd className="mt-0.5 text-ink">{commitment.committedByActorName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-ink-3">Committed at</dt>
                    <dd className="mt-0.5 font-mono text-[0.8125rem] tabular-nums text-ink">
                      <time dateTime={commitment.committedAt.toISOString()}>{formatUtcTimestamp(commitment.committedAt)}</time>
                    </dd>
                  </div>
                </div>
              </dl>
            </section>
          )}

          {canDecide && (
            <section className={cn(card, "border-accent-line")} aria-labelledby="decision-heading">
              <div className={cardHeader}>
                <div className="flex items-center gap-2">
                  <StampIcon size={18} className="text-accent" aria-hidden="true" />
                  <h2 id="decision-heading" className={cardTitle}>Record decision</h2>
                </div>
              </div>
              <div className="grid gap-4 px-5 py-4">
                {!canApprove && session.approvalLimitMinor !== null && (
                  <p className="flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2.5 text-[0.8125rem] leading-relaxed text-warning">
                    <WarningIcon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      This request exceeds your approval limit ({formatUsd(session.approvalLimitMinor)}). You may reject it, or escalate approval to a higher-authority approver.
                    </span>
                  </p>
                )}
                <DecisionForm requestId={purchase.id} />
              </div>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
    {switcher}
    </>
  );
}
