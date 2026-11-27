/* PROTOTYPE Variant B — Approval-First Workspace: inbox master-detail; the selected request is reviewed in place. */
import Link from "next/link";
import type { PurchaseRequest } from "../../modules/procurement/domain/procurement";
import { integrityStatus } from "../_components/dashboard-metrics";
import { ArrowRightIcon, TrayIcon, WalletIcon } from "../_components/icons";
import { cn } from "../_components/ui";
import { formatUsd, formatUtcShortDate } from "../format-purchase";
import { approverQueue, asOfLabel, plural, references, statusLabel, waitingDays, type DashboardData } from "./data";
import { ReviewPaneB } from "./review-b.prototype";
import { InboxKeys } from "./inbox-keys";
import { ShellB } from "./shell-b";

type Group = { key: string; title: string; note?: string; items: PurchaseRequest[] };

const tone = (status: PurchaseRequest["status"]) =>
  status === "APPROVED" ? "text-(--p-approved)" : status === "REJECTED" ? "text-(--p-violation)" : "text-(--p-pending)";

export function DashboardB({ data }: { data: DashboardData }) {
  const { session, purchases, costCenters, metrics, asOf, selected } = data;
  const ref = references(purchases.map((p) => p.id));
  const approver = session.role === "APPROVER";
  const decided = purchases.filter((p) => p.status !== "PENDING").toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const groups: Group[] = approver
    ? [...approverQueue(purchases, costCenters, session.approvalLimitMinor), { key: "decided", title: "Recently decided", items: decided.slice(0, 6) }]
    : session.role === "REQUESTER"
      ? [{ key: "pending", title: "Waiting for a decision", items: purchases.filter((p) => p.status === "PENDING") }, { key: "decided", title: "Decided", items: decided }]
      : [{ key: "decided", title: "Decided", items: decided }, { key: "pending", title: "Pending", items: purchases.filter((p) => p.status === "PENDING") }];
  const selectedId = selected?.detail.purchase.id;
  const integrity = integrityStatus(metrics);
  const readyTotal = approver ? groups[0].items.reduce((s, p) => s + p.amountMinor, 0) : 0;
  const next = approver ? groups.find((group) => group.key === "ready")?.items[0] ?? metrics.queue[0] : undefined;

  return (
    <ShellB
      session={session}
      identities={data.identities}
      nav={[
        { href: "/dashboard?variant=B", label: approver ? "Inbox" : "Requests", icon: <TrayIcon size={20} />, current: true, count: approver ? metrics.queue.length : undefined },
        { href: "/dashboard?variant=B#ledger", label: "Budgets", icon: <WalletIcon size={20} /> },
      ]}
    >
      <InboxKeys />
      <header className="ph-workspace-heading">
        <div>
          <h1>
            {approver ? "Approval workspace" : session.role === "REQUESTER" ? "Your purchase requests" : "Requests and outcomes"}
          </h1>
          <p className="p-figures mt-0.5 text-sm text-(--p-ink-3)">
            {approver && <>{plural(metrics.queue.length, "request")} awaiting review · {formatUsd(readyTotal)} within current budget and limit · </>}
            As of {asOfLabel(asOf)}
          </p>
        </div>
        {next && <Link href={`/requests/${next.id}?variant=B`} className="ph-workspace-action">Review next request <ArrowRightIcon size={18} aria-hidden="true" /></Link>}
        {session.role === "REQUESTER" && (
          <Link href="/?variant=0#new-request" className="inline-flex min-h-10 items-center rounded-md bg-(--p-accent) px-4 text-sm font-semibold text-white hover:bg-(--p-accent-hover)">New purchase request</Link>
        )}
      </header>

      {(integrity.kind === "over-allocation" || (integrity.kind === "unreconciled" && session.role !== "REQUESTER")) && (
        <p role="alert" className="border-b border-(--p-violation) bg-(--p-violation-soft) px-4 py-2.5 text-sm text-(--p-violation) sm:px-6">
          {integrity.kind === "over-allocation"
            ? integrity.centers.map((c) => `${c.code} is over its allocation by ${formatUsd(c.overAllocationMinor)}.`).join(" ")
            : `Committed budget differs from approved requests in ${integrity.centers.map((c) => c.code).join(", ")}.`}
        </p>
      )}

      <dl className="ph-budget-strip p-figures">
        <div><dt>Available budget</dt><dd>{formatUsd(metrics.availableMinor)}</dd><small>{formatUsd(metrics.allocatedMinor)} allocated · {costCenters.length} cost centers</small></div>
        <div><dt>Committed spend</dt><dd>{formatUsd(metrics.committedMinor)}</dd><small>Budget already committed</small></div>
        <div><dt>{session.role === "REQUESTER" ? "Your pending requests" : "Pending exposure"}</dt><dd>{formatUsd(metrics.pendingMinor)}</dd><small>{plural(metrics.byStatus.PENDING.count, "request")} awaiting decision</small></div>
      </dl>
      <div className="ph-inbox-frame grid xl:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)]">
        <section aria-label="Inbox" className="min-w-0 border-b border-(--p-line) bg-(--p-surface) xl:border-r xl:border-b-0 xl:max-h-[42rem] xl:overflow-y-auto">
          <div className="ph-queue-head">Purchase requests</div>
          {groups.filter((g) => g.items.length).map((group) => (
            <div key={group.key}>
              <h2 className="sticky top-0 z-10 border-b border-(--p-line) bg-(--p-canvas) px-4 py-2 text-xs font-semibold text-(--p-ink-2)">
                {group.title} <span className="p-figures font-normal text-(--p-ink-3)">{group.items.length}</span>
                {group.note && <span className="block font-normal text-(--p-ink-3)">{group.note}</span>}
              </h2>
              <ul>
                {group.items.map((p) => {
                  const current = p.id === selectedId;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/dashboard?variant=B&select=${p.id}#selected-request`}
                        scroll={false}
                        data-inbox-item
                        aria-current={current ? "true" : undefined}
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-(--p-line) px-4 py-3 text-sm",
                          current ? "bg-(--p-accent-soft) shadow-[inset_3px_0_0_var(--p-accent)]" : "hover:bg-(--p-canvas)",
                        )}
                      >
                        <span className="break-words font-semibold">{p.title}</span>
                        <span className="p-figures text-right font-semibold">{formatUsd(p.amountMinor)}</span>
                        <span className="truncate text-xs text-(--p-ink-3)">
                          <span translate="no">{ref(p.id)}</span> · {p.costCenterCode} · {p.status === "PENDING" ? `waiting ${waitingDays(p.createdAt, asOf)}` : formatUtcShortDate(p.updatedAt)}
                        </span>
                        <span className={cn("text-right text-xs font-medium", tone(p.status))}>{p.status === "PENDING" ? "Review →" : statusLabel[p.status]}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {purchases.length === 0 && <p className="p-6 text-sm text-(--p-ink-3)">Nothing here yet.</p>}
        </section>

        <section id="selected-request" aria-label="Selected request" className="ph-selected-heading min-w-0">
          {selected ? <ReviewPaneB session={session} detail={selected.detail} events={selected.events} asOf={asOf} /> : (
            <div className="grid h-full place-items-center p-10 text-center text-sm text-(--p-ink-3)">Select a request to review it here.</div>
          )}
          <div id="ledger" className="border-t border-(--p-line) px-6 py-5">
            <h2 className="text-sm font-semibold">Budgets</h2>
            <ul className="p-figures mt-3 grid gap-4 text-sm sm:grid-cols-2">
              {costCenters.map((c) => (
                <li key={c.id}>
                  <span className="block text-(--p-ink-2)">{c.name}</span>
                  <span className={cn("block text-lg font-semibold", c.availableBudgetMinor < 0 && "text-(--p-violation)")}>{formatUsd(c.availableBudgetMinor)}</span>
                  <span className="block text-xs text-(--p-ink-3)">available of {formatUsd(c.allocatedBudgetMinor)}</span>
                  <div className="mt-2 h-2 overflow-hidden rounded-sm bg-(--p-track)" aria-hidden="true"><div className={cn("h-full", c.availableBudgetMinor < 0 ? "bg-(--p-violation)" : "bg-(--p-accent)")} style={{ width: Math.min(100, Math.max(0, c.allocatedBudgetMinor > 0 ? c.committedBudgetMinor / c.allocatedBudgetMinor * 100 : c.committedBudgetMinor > 0 ? 100 : 0)) + "%" }} /></div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </ShellB>
  );
}

