/* PROTOTYPE Variant B review: the inbox detail pane as a focused page with a sticky action footer. */
import Link from "next/link";
import type { AuditEvent, PurchaseRequest } from "../../modules/procurement/domain/procurement";
import { TrayIcon, WalletIcon } from "../_components/icons";
import { cn } from "../_components/ui";
import { formatUsd, formatUtcTimestamp } from "../format-purchase";
import { references, statusLabel, waitingDays, type Detail, type ReviewData, type Session } from "./data";
import { DecisionStub } from "./decision-stub";
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

  return (
    <article className={cn("flex flex-col", fullPage ? "min-h-[calc(100dvh-6rem)]" : "min-h-[28rem]")}>
      <div className={cn("grid gap-5 px-6 py-6", fullPage && "mx-auto w-full max-w-4xl")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-(--p-ink-3)"><span translate="no">{ref}</span> · {costCenter.name}</p>
            <Heading className="mt-1 text-2xl font-semibold tracking-[-0.015em]">{purchase.title}</Heading>
            <p className="mt-1 text-sm text-(--p-ink-3)">
              {requester ? `${requester} · ` : ""}submitted {formatUtcTimestamp(purchase.createdAt)}
              {purchase.status === "PENDING" && <> · waiting {waitingDays(purchase.createdAt, asOf)}</>}
            </p>
          </div>
          <p className="p-figures text-3xl font-semibold tracking-[-0.02em]">{formatUsd(purchase.amountMinor)}</p>
        </div>

        <p className="max-w-prose text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-(--p-ink-2)">{purchase.justification}</p>

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
          <ol className="grid gap-2 border-l border-(--p-line-strong) pl-4 text-sm">
            {events.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{e.type === "CREATED" ? "Submitted" : e.type === "APPROVED" ? "Approved" : "Rejected"}</span> · {e.actorName}
                <span className="text-xs text-(--p-ink-3)"> · {formatUtcTimestamp(e.occurredAt)}</span>
                {e.reason && <span className="block text-(--p-ink-2)">“{e.reason}”</span>}
              </li>
            ))}
          </ol>
        )}
        {!events && purchase.status === "PENDING" && (
          <p className="text-sm text-(--p-ink-2)">Next: an approver in {session.tenantName} decides. You will see the outcome here.</p>
        )}
        {commitment && <p className="p-figures text-sm">{formatUsd(commitment.amountMinor)} committed by {commitment.committedByActorName}.</p>}
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-(--p-line) bg-(--p-surface)/95 backdrop-blur-sm">
        <div className={cn("flex flex-wrap items-center justify-between gap-3 px-6 py-3", fullPage && "mx-auto max-w-4xl")}>
          {fullPage ? (
            nextPending ? (
              <Link href={`/requests/${nextPending.id}?variant=B`} className="text-sm font-medium text-(--p-accent) hover:underline">Next: {nextPending.title} →</Link>
            ) : <Link href="/?variant=B" className="text-sm font-medium text-(--p-accent) hover:underline">← Back to inbox</Link>
          ) : (
            <Link href={`/requests/${purchase.id}?variant=B`} className="text-sm font-medium text-(--p-accent) hover:underline">Open full review</Link>
          )}
          {canDecide ? (
            <DecisionStub mode="footer" impact={{ amountMinor: purchase.amountMinor, availableMinor: costCenter.availableBudgetMinor, limitMinor: session.approvalLimitMinor, costCenterCode: costCenter.code, canApprove, overLimit }} />
          ) : (
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
        { href: "/?variant=B", label: data.session.role === "APPROVER" ? "Inbox" : "Requests", icon: <TrayIcon size={20} />, current: true },
        { href: "/?variant=B#ledger", label: "Budgets", icon: <WalletIcon size={20} /> },
      ]}
    >
      <ReviewPaneB session={data.session} detail={data.detail} events={data.events} asOf={data.asOf} nextPending={data.nextPending} fullPage />
    </ShellB>
  );
}
