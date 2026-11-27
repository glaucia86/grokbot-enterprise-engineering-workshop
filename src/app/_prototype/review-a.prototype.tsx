/* PROTOTYPE Variant A review: three-column statement — request · ledger impact · authority and decision. */
import Link from "next/link";
import { cn } from "../_components/ui";
import { formatUsd, formatUtcTimestamp } from "../format-purchase";
import { references, statusLabel, waitingDays, type ReviewData } from "./data";
import { DecisionStub } from "./decision-stub";
import { BulletA, ShellA } from "./shell-a";

export function ReviewA({ data }: { data: ReviewData }) {
  const { session, detail, events, nextPending, asOf } = data;
  const { purchase, costCenter, commitment, canDecide, canApprove } = detail;
  const ref = references([purchase.id])(purchase.id);
  const pending = purchase.status === "PENDING";
  const projected = costCenter.availableBudgetMinor - purchase.amountMinor;
  const requester = events?.find((event) => event.type === "CREATED")?.actorName;
  const overLimit = session.role === "APPROVER" && session.approvalLimitMinor !== null && purchase.amountMinor > session.approvalLimitMinor;
  const statusTone = purchase.status === "APPROVED" ? "text-(--p-approved)" : purchase.status === "REJECTED" ? "text-(--p-violation)" : "text-(--p-pending)";

  return (
    <ShellA
      session={session}
      identities={data.identities}
      asOf={asOf}
      nav={[
        { href: "/?variant=A", label: "Overview" },
        { href: "#request", label: "Purchase request", current: true },
        { href: "#impact", label: "Ledger impact" },
        ...(events ? [{ href: "#trail", label: "Audit trail" }] : []),
      ]}
      title={purchase.title}
      subtitle={<><span translate="no">{ref}</span> · {costCenter.name} · <span className={cn("font-medium", statusTone)}>{statusLabel[purchase.status]}</span></>}
    >
      <Link href="/?variant=A#decisions" className="text-sm font-medium text-(--p-accent) hover:underline">← Back to the decision queue</Link>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <section id="request" aria-labelledby="request-heading" className="grid gap-5">
          <h2 id="request-heading" className="border-b-2 border-(--p-ink) pb-2 text-base font-semibold">Request</h2>
          <p className="p-figures text-[2.25rem] leading-none font-semibold tracking-[-0.02em]">{formatUsd(purchase.amountMinor)}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-xs text-(--p-ink-3)">Requested by</dt><dd>{requester ?? (session.role === "REQUESTER" ? "You" : "Requester")}</dd></div>
            <div><dt className="text-xs text-(--p-ink-3)">Submitted</dt><dd>{formatUtcTimestamp(purchase.createdAt)}</dd></div>
            <div><dt className="text-xs text-(--p-ink-3)">Cost center</dt><dd>{costCenter.name} <span className="text-(--p-ink-3)" translate="no">{costCenter.code}</span></dd></div>
            <div><dt className="text-xs text-(--p-ink-3)">Waiting</dt><dd>{pending ? waitingDays(purchase.createdAt, asOf) : "Decided"}</dd></div>
          </dl>
          <div>
            <h3 className="text-xs text-(--p-ink-3)">Business justification</h3>
            <p className="mt-1 max-w-prose text-[0.9375rem] leading-relaxed whitespace-pre-wrap">{purchase.justification}</p>
          </div>
          <details className="text-sm text-(--p-ink-2)">
            <summary className="cursor-pointer text-xs font-medium text-(--p-ink-3)">Technical details</summary>
            <dl className="mt-2 grid gap-1 text-xs">
              <div><dt className="inline text-(--p-ink-3)">Request ID </dt><dd className="inline font-mono break-all" translate="no">{purchase.id}</dd></div>
              {commitment && <div><dt className="inline text-(--p-ink-3)">Commitment ID </dt><dd className="inline font-mono break-all" translate="no">{commitment.id}</dd></div>}
            </dl>
          </details>
        </section>

        <section id="impact" aria-labelledby="impact-heading" className="grid gap-4">
          <h2 id="impact-heading" className="border-b-2 border-(--p-ink) pb-2 text-base font-semibold">Ledger impact · {costCenter.code}</h2>
          <BulletA allocatedMinor={costCenter.allocatedBudgetMinor} committedMinor={costCenter.committedBudgetMinor} pendingMinor={pending ? purchase.amountMinor : 0} />
          <dl className="p-figures grid text-sm">
            <div className="flex justify-between border-b border-(--p-line) py-2"><dt className="text-(--p-ink-2)">Allocated</dt><dd>{formatUsd(costCenter.allocatedBudgetMinor)}</dd></div>
            <div className="flex justify-between border-b border-(--p-line) py-2"><dt className="text-(--p-ink-2)">Committed</dt><dd>{formatUsd(costCenter.committedBudgetMinor)}</dd></div>
            <div className="flex justify-between border-b border-(--p-line) py-2 font-semibold"><dt>Available now</dt><dd>{formatUsd(costCenter.availableBudgetMinor)}</dd></div>
            {pending && (
              <>
                <div className="flex justify-between border-b border-(--p-line) py-2"><dt className="text-(--p-ink-2)">This request</dt><dd>−{formatUsd(purchase.amountMinor)}</dd></div>
                <div className={cn("flex justify-between py-2 text-base font-semibold", projected < 0 && "text-(--p-violation)")}>
                  <dt>Available if approved</dt><dd>{formatUsd(projected)}</dd>
                </div>
              </>
            )}
          </dl>
          {pending && projected < 0 && (
            <p className="border-l-4 border-(--p-violation) bg-(--p-violation-soft) px-3 py-2 text-[0.8125rem] text-(--p-violation)">
              Approving now would exceed the available budget. The server refuses it unless budget is freed first.
            </p>
          )}
          <p className="text-xs text-(--p-ink-3)">Balances as of page load. Other approvals can change them before you confirm.</p>
        </section>

        <section aria-labelledby="decision-heading" className="grid gap-4 rounded-lg border border-(--p-line) bg-(--p-surface) p-5 xl:sticky xl:top-6">
          <h2 id="decision-heading" className="text-base font-semibold">Authority and decision</h2>
          {session.role === "APPROVER" && session.approvalLimitMinor !== null && (
            <dl className="p-figures grid gap-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-(--p-ink-2)">Your approval limit</dt><dd>{formatUsd(session.approvalLimitMinor)}</dd></div>
              <div className="flex justify-between"><dt className="text-(--p-ink-2)">This request</dt><dd className={overLimit ? "font-semibold text-(--p-violation)" : undefined}>{formatUsd(purchase.amountMinor)}</dd></div>
            </dl>
          )}
          {canDecide ? (
            <DecisionStub
              mode="panel"
              impact={{ amountMinor: purchase.amountMinor, availableMinor: costCenter.availableBudgetMinor, limitMinor: session.approvalLimitMinor, costCenterCode: costCenter.code, canApprove, overLimit }}
            />
          ) : (
            <p className="text-sm text-(--p-ink-2)">
              {pending ? "Only an approver other than the requester can decide this request." : `${statusLabel[purchase.status]}. Terminal decisions cannot change.`}
            </p>
          )}
          {commitment && (
            <p className="p-figures border-t border-(--p-line) pt-3 text-sm">
              {formatUsd(commitment.amountMinor)} committed by {commitment.committedByActorName} on {formatUtcTimestamp(commitment.committedAt)}.
            </p>
          )}
          {nextPending && (
            <Link href={`/requests/${nextPending.id}?variant=A`} className="border-t border-(--p-line) pt-3 text-sm text-(--p-accent) hover:underline">
              Next waiting: {nextPending.title} · {formatUsd(nextPending.amountMinor)} →
            </Link>
          )}
        </section>
      </div>

      {events && (
        <section id="trail" aria-labelledby="trail-heading" className="mt-10 max-w-3xl">
          <h2 id="trail-heading" className="border-b-2 border-(--p-ink) pb-2 text-base font-semibold">Audit trail</h2>
          <ol className="mt-2">
            {events.map((event) => (
              <li key={event.id} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 border-b border-(--p-line) py-3 text-sm">
                <time className="text-xs text-(--p-ink-3)" dateTime={event.occurredAt.toISOString()}>{formatUtcTimestamp(event.occurredAt)}</time>
                <div>
                  <p><span className="font-medium">{event.type === "CREATED" ? "Submitted" : event.type === "APPROVED" ? "Approved" : "Rejected"}</span> by {event.actorName}</p>
                  {event.reason && <p className="mt-1 text-(--p-ink-2)">“{event.reason}”</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </ShellA>
  );
}
