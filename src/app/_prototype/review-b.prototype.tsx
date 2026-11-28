/* The same authorized review is available in the inbox and on its own page. */
import Link from "next/link";
import type { AuditEvent, PurchaseRequest } from "../../modules/procurement/domain/procurement";
import { TrayIcon, WalletIcon } from "../_components/icons";
import { StatusBadge } from "../_components/status-badge";
import { cn } from "../_components/ui";
import { formatUsd, formatUtcTimestamp } from "../format-purchase";
import { references, statusLabel, waitingDays, type Detail, type ReviewData, type Session } from "./data";
import { DecisionForm } from "../requests/[id]/decision-form";
import { ShellB } from "./shell-b";

const tone = (status: PurchaseRequest["status"]) =>
  status === "APPROVED" ? "text-(--p-approved)" : status === "REJECTED" ? "text-(--p-violation)" : "text-(--p-pending)";

export function ReviewPaneB({ session, detail, events, asOf, nextPending, fullPage = false }: {
  session: Session;
  detail: Detail;
  events: AuditEvent[] | null;
  asOf: Date;
  nextPending?: PurchaseRequest | null;
  fullPage?: boolean;
}) {
  const { purchase, costCenter, commitment, canDecide, canApprove } = detail;
  const ref = references([purchase.id])(purchase.id);
  const projected = costCenter.availableBudgetMinor - purchase.amountMinor;
  const overLimit = session.role === "APPROVER" && session.approvalLimitMinor !== null && purchase.amountMinor > session.approvalLimitMinor;
  const requester = events?.find((e) => e.type === "CREATED")?.actorName;
  const Heading = fullPage ? "h1" : "h2";
  const SectionHeading = fullPage ? "h2" : "h3";
  const sectionId = `request-${purchase.id}`;

  return (
    <article className="flex flex-col">
      <div className={cn("grid gap-5 px-6 py-6", fullPage && "mx-auto w-full max-w-4xl")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-(--p-ink-3)"><span translate="no">{ref}</span> · {costCenter.name}</p>
            <Heading className="mt-1 text-2xl font-semibold tracking-[-0.015em] break-words">{purchase.title}</Heading>
            <p className="mt-1 text-sm text-(--p-ink-3)">
              {requester ? `${requester} · ` : ""}submitted {formatUtcTimestamp(purchase.createdAt)}
              {purchase.status === "PENDING" && <> · waiting {waitingDays(purchase.createdAt, asOf)}</>}
            </p>
          </div>
          <div className="ph-review-total p-figures"><small>Requested amount</small><p className="text-3xl font-semibold tracking-[-0.04em]">{formatUsd(purchase.amountMinor)}</p><StatusBadge status={purchase.status} live className="mt-2" /></div>
        </div>

        <section><SectionHeading className="mb-1 text-xs font-semibold text-(--p-ink-3)">Business justification</SectionHeading><p className="max-w-prose text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words text-(--p-ink-2)">{purchase.justification}</p></section>
        <SectionHeading className="text-base font-semibold">Financial impact</SectionHeading>

        <dl className="p-figures grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-(--p-line) bg-(--p-line) text-sm sm:grid-cols-4">
          <div className="bg-(--p-surface) px-4 py-3"><dt className="text-xs text-(--p-ink-3)">Available now</dt><dd className="mt-0.5 font-semibold">{formatUsd(costCenter.availableBudgetMinor)}</dd></div>
          <div className="bg-(--p-surface) px-4 py-3"><dt className="text-xs text-(--p-ink-3)">This request</dt><dd className="mt-0.5 font-semibold">−{formatUsd(purchase.amountMinor)}</dd></div>
          <div className="bg-(--p-surface) px-4 py-3">
            <dt className="text-xs text-(--p-ink-3)">If approved</dt>
            <dd className={cn("mt-0.5 font-semibold", projected < 0 && "text-(--p-violation)")}>{purchase.status === "PENDING" ? formatUsd(projected) : "—"}</dd>
          </div>
          <div className="bg-(--p-surface) px-4 py-3">
            <dt className="text-xs text-(--p-ink-3)">Your limit</dt>
            <dd className={cn("mt-0.5 font-semibold", overLimit && "text-(--p-violation)")}>{session.approvalLimitMinor !== null ? formatUsd(session.approvalLimitMinor) : "—"}</dd>
          </div>
        </dl>
        <p className="-mt-3 text-xs text-(--p-ink-3)">Balances as of page load; the server rechecks them when you confirm.</p>

        {events && (
          <section aria-labelledby={`${sectionId}-audit`}>
            <SectionHeading id={`${sectionId}-audit`} className="mb-3 text-base font-semibold">Audit trail</SectionHeading>
            <ol className="grid gap-3 border-l border-(--p-line-strong) pl-4 text-sm">
              {events.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.type}</span> · {e.actorName}
                  <time className="text-xs text-(--p-ink-3)" dateTime={e.occurredAt.toISOString()}> · {formatUtcTimestamp(e.occurredAt)}</time>
                  {e.reason && <span className="block whitespace-pre-wrap break-words text-(--p-ink-2)">“{e.reason}”</span>}
                </li>
              ))}
            </ol>
          </section>
        )}
        {!events && purchase.status === "PENDING" && (
          <p className="text-sm text-(--p-ink-2)">Next: an approver in {session.tenantName} decides. You will see the outcome here.</p>
        )}
        {commitment && (
          <section className="ph-commitment" aria-labelledby={`${sectionId}-commitment`}>
            <SectionHeading id={`${sectionId}-commitment`} className="text-base font-semibold">Financial commitment</SectionHeading>
            <p className="p-figures mt-2 text-sm"><strong>{formatUsd(commitment.amountMinor)}</strong> committed by {commitment.committedByActorName}.</p>
            <p className="mt-1 text-xs text-(--p-ink-3)"><time dateTime={commitment.committedAt.toISOString()}>{formatUtcTimestamp(commitment.committedAt)}</time></p>
          </section>
        )}
        {canDecide && (
          <section className="ph-decision-panel" aria-labelledby={`${sectionId}-decision`}>
            <SectionHeading id={`${sectionId}-decision`} className="text-base font-semibold">Record decision</SectionHeading>
            {overLimit && session.approvalLimitMinor !== null && <p className="text-sm text-warning">This request exceeds your approval limit ({formatUsd(session.approvalLimitMinor)}). You may reject it, or ask a higher-authority approver to review it.</p>}
            {!canApprove && !overLimit && <p className="text-sm text-warning">Your current approval authority does not cover this request. You may reject it, or ask an authorized approver to review it.</p>}
            {projected < 0 && <p className="text-sm text-warning">The current budget is insufficient for approval. The server checks the available balance when you save the decision.</p>}
            <DecisionForm key={purchase.id} requestId={purchase.id} />
          </section>
        )}
      </div>

      <div className="mt-auto border-t border-(--p-line) bg-(--p-surface)/95 backdrop-blur-sm">
        <div className={cn("flex flex-wrap items-center justify-between gap-3 px-6 py-3", fullPage && "mx-auto max-w-4xl")}>
          {fullPage ? (
            <Link href="/dashboard" className="text-sm font-medium text-(--p-accent) hover:underline"><span aria-hidden="true">← </span>Back to purchase requests</Link>
          ) : (
            <Link href={`/requests/${purchase.id}`} className="text-sm font-medium text-(--p-accent) hover:underline">Open full review</Link>
          )}
          {fullPage && nextPending && <Link href={`/requests/${nextPending.id}`} className="min-w-0 max-w-full text-sm font-medium break-words text-(--p-accent) hover:underline">Next: {nextPending.title} →</Link>}
          {!canDecide && (
            <span className={cn("text-sm font-medium", tone(purchase.status))}>{statusLabel[purchase.status]}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ReviewB({ data }: { data: ReviewData }) {
  return (
    <ShellB
      session={data.session}
      identities={data.identities}
      nav={[
        { href: "/dashboard", label: data.session.role === "APPROVER" ? "Inbox" : "Requests", icon: <TrayIcon size={20} />, current: true },
        { href: "/dashboard#ledger", label: "Budgets", icon: <WalletIcon size={20} /> },
      ]}
    >
      <ReviewPaneB session={data.session} detail={data.detail} events={data.events} asOf={data.asOf} nextPending={data.nextPending} fullPage />
    </ShellB>
  );
}
