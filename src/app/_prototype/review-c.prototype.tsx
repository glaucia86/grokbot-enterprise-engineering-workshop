/* PROTOTYPE Variant C review: a memorandum with margin notes and a signature block. */
import Link from "next/link";
import { cn } from "../_components/ui";
import { formatUsd, formatUtcTimestamp } from "../format-purchase";
import { longDate, references, statusLabel, waitingDays, type ReviewData } from "./data";
import { DecisionStub } from "./decision-stub";
import { RuleChart, ShellC } from "./shell-c";

export function ReviewC({ data }: { data: ReviewData }) {
  const { session, detail, events, nextPending, asOf } = data;
  const { purchase, costCenter, commitment, canDecide, canApprove } = detail;
  const ref = references([purchase.id])(purchase.id);
  const pending = purchase.status === "PENDING";
  const projected = costCenter.availableBudgetMinor - purchase.amountMinor;
  const requester = events?.find((e) => e.type === "CREATED")?.actorName ?? (session.role === "REQUESTER" ? session.displayName : "Requester");
  const overLimit = session.role === "APPROVER" && session.approvalLimitMinor !== null && purchase.amountMinor > session.approvalLimitMinor;

  return (
    <ShellC
      session={session}
      identities={data.identities}
      asOf={asOf}
      sections={[{ href: "/?variant=C", label: "Brief" }, { href: "#memo", label: "Memorandum" }, { href: "#impact", label: "Ledger note" }, ...(events ? [{ href: "#record", label: "Record" }] : [])]}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article id="memo" aria-labelledby="memo-title" className="max-w-[44rem]">
          <p className="text-xs font-semibold tracking-[0.12em] text-(--p-gold-ink)">MEMORANDUM · <span translate="no">{ref}</span></p>
          <dl className="mt-5 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-y-1.5 border-y border-(--p-ink) py-4 text-sm">
            <dt className="text-(--p-ink-3)">From</dt><dd>{requester}</dd>
            <dt className="text-(--p-ink-3)">To</dt><dd>Approvers, <span translate="no">{session.tenantName}</span></dd>
            <dt className="text-(--p-ink-3)">Date</dt><dd>{longDate(purchase.createdAt)}</dd>
            <dt className="text-(--p-ink-3)">Re</dt><dd>{formatUsd(purchase.amountMinor)} against {costCenter.name}</dd>
          </dl>
          <h1 id="memo-title" className="p-serif-c mt-8 text-[2.5rem] leading-[1.1]">{purchase.title}</h1>
          <p className="mt-6 text-[1.0625rem] leading-[1.7] whitespace-pre-wrap">{purchase.justification}</p>
          <p className="mt-6 text-sm text-(--p-ink-3)">
            Status: <span className={cn("font-semibold", purchase.status === "APPROVED" ? "text-(--p-approved)" : purchase.status === "REJECTED" ? "text-(--p-violation)" : "text-(--p-pending)")}>{statusLabel[purchase.status]}</span>
            {pending && <> · waiting {waitingDays(purchase.createdAt, asOf)}</>}
          </p>

          <section aria-labelledby="signature-heading" className="mt-12 border-t-2 border-(--p-ink) pt-6">
            <h2 id="signature-heading" className="text-xs font-semibold tracking-[0.12em] text-(--p-ink-3)">DECISION</h2>
            {canDecide ? (
              <div className="mt-4 grid gap-4">
                <p className="p-serif-c text-[1.5rem] leading-snug">
                  I, {session.displayName}, decide this request{overLimit ? ", which exceeds my approval limit," : ""} as follows:
                </p>
                <DecisionStub mode="signature" impact={{ amountMinor: purchase.amountMinor, availableMinor: costCenter.availableBudgetMinor, limitMinor: session.approvalLimitMinor, costCenterCode: costCenter.code, canApprove, overLimit }} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-(--p-ink-2)">
                {pending ? "Awaiting an approver other than the requester." : `${statusLabel[purchase.status]}. A terminal decision cannot change.`}
                {commitment && <> {formatUsd(commitment.amountMinor)} was committed by {commitment.committedByActorName} on {formatUtcTimestamp(commitment.committedAt)}.</>}
              </p>
            )}
            {nextPending && (
              <Link href={`/requests/${nextPending.id}?variant=C`} className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-(--p-accent)">
                Next on the desk: {nextPending.title}
              </Link>
            )}
          </section>

          {events && (
            <section id="record" aria-labelledby="record-heading" className="mt-12">
              <h2 id="record-heading" className="text-xs font-semibold tracking-[0.12em] text-(--p-ink-3)">RECORD</h2>
              <ol className="mt-3 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="border-b border-(--p-line) py-2.5">
                    <span className="font-medium">{e.type === "CREATED" ? "Submitted" : e.type === "APPROVED" ? "Approved" : "Rejected"}</span> by {e.actorName}
                    <span className="text-(--p-ink-3)"> · {formatUtcTimestamp(e.occurredAt)}</span>
                    {e.reason && <span className="block italic text-(--p-ink-2)">“{e.reason}”</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </article>

        <aside id="impact" aria-label="Margin notes" className="grid content-start gap-8 text-sm lg:sticky lg:top-8 lg:border-l lg:border-(--p-line) lg:pl-6">
          <figure>
            <RuleChart allocatedMinor={costCenter.allocatedBudgetMinor} committedMinor={costCenter.committedBudgetMinor} pendingMinor={pending ? purchase.amountMinor : 0} />
            <figcaption className="p-figures mt-3 grid gap-1">
              <span className="text-xs text-(--p-ink-3)">Ledger note · <span translate="no">{costCenter.code}</span></span>
              <span>{formatUsd(costCenter.availableBudgetMinor)} available of {formatUsd(costCenter.allocatedBudgetMinor)}.</span>
              {pending && (
                <span className={projected < 0 ? "font-semibold text-(--p-violation)" : undefined}>
                  {projected < 0 ? `Approving now would leave ${formatUsd(projected)}; the server refuses it.` : `If approved, ${formatUsd(projected)} remains.`}
                </span>
              )}
              <span className="text-xs text-(--p-ink-3)">As of page load.</span>
            </figcaption>
          </figure>
          {session.approvalLimitMinor !== null && (
            <p className="p-figures">
              <span className="block text-xs text-(--p-ink-3)">Authority</span>
              Your limit is {formatUsd(session.approvalLimitMinor)}; this request is {formatUsd(purchase.amountMinor)}.
            </p>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-(--p-ink-3)">Technical details</summary>
            <p className="mt-2 font-mono text-xs break-all" translate="no">{purchase.id}</p>
          </details>
        </aside>
      </div>
    </ShellC>
  );
}
