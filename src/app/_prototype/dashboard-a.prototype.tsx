/* PROTOTYPE Variant A — Institutional Command Center: the cost-center ledger is the primary object. */
import Link from "next/link";
import type { PurchaseRequest } from "../../modules/procurement/domain/procurement";
import { integrityStatus } from "../_components/dashboard-metrics";
import { cn } from "../_components/ui";
import { formatUsd, formatUtcShortDate, formatUtcTimestamp } from "../format-purchase";
import { approverQueue, plural, references, statusLabel, waitingDays, type DashboardData } from "./data";
import { BulletA, ShellA } from "./shell-a";

const th = "border-b border-(--p-line) px-3 py-2 text-left text-xs font-medium text-(--p-ink-3)";
const td = "border-b border-(--p-line) px-3 py-2.5 align-top";

function StatusText({ status }: { status: PurchaseRequest["status"] }) {
  const tone = status === "APPROVED" ? "text-(--p-approved)" : status === "REJECTED" ? "text-(--p-violation)" : "text-(--p-pending)";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[0.8125rem] font-medium", tone)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusLabel[status]}
    </span>
  );
}

export function DashboardA({ data }: { data: DashboardData }) {
  const { session, metrics, purchases, costCenters, asOf } = data;
  const ref = references(purchases.map((p) => p.id));
  const status = integrityStatus(metrics);
  const approver = session.role === "APPROVER";
  const auditor = session.role === "AUDITOR";
  const groups = approver ? approverQueue(purchases, costCenters, session.approvalLimitMinor) : [];
  const actionable = groups.find((g) => g.key === "ready")?.items ?? [];
  const detailHref = (id: string) => `/requests/${id}?variant=A`;

  const nav = [
    { href: "#top", label: "Overview", current: true },
    ...(approver ? [{ href: "#decisions", label: "Decisions", count: metrics.queue.length }] : []),
    { href: "#ledger", label: "Cost center ledger" },
    { href: "#requests", label: session.role === "REQUESTER" ? "Your requests" : "All requests", count: purchases.length },
    ...(auditor ? [{ href: "#trail", label: "Recent audit events" }] : []),
  ];

  return (
    <ShellA session={session} identities={data.identities} asOf={asOf} nav={nav} title="Financial overview">
      <div id="top" className="grid grid-cols-[minmax(0,1fr)] gap-8">
        {metrics.overspentCenters.length > 0 && (
          <section role="alert" className="border-l-4 border-(--p-violation) bg-(--p-violation-soft) px-5 py-4">
            <p className="font-semibold text-(--p-violation)">Committed budget exceeds allocation</p>
            <p className="mt-1 text-sm text-(--p-ink-2)">
              {metrics.overspentCenters.map((c) => `${c.code} is over its allocation by ${formatUsd(-c.availableBudgetMinor)}.`).join(" ")}
            </p>
          </section>
        )}

        {approver && (
          <section aria-label="Your next action" className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-(--p-navy) px-6 py-5 text-white">
            <div>
              <p className="text-[1.375rem] font-semibold">{plural(metrics.queue.length, "request")} awaiting your decision</p>
              <p className="p-figures mt-1 text-sm text-(--p-navy-ink)">
                {formatUsd(actionable.reduce((s, p) => s + p.amountMinor, 0))} ready within your authority
                {groups[1].items.length > 0 && <> · {groups[1].items.length} may exceed available budget</>}
                {groups[2].items.length > 0 && <> · {groups[2].items.length} need higher authority</>}
              </p>
            </div>
            {metrics.queue[0] && (
              <Link href={detailHref((actionable[0] ?? metrics.queue[0]).id)} className="inline-flex min-h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-(--p-navy) hover:bg-(--p-navy-ink)">
                Review next request
              </Link>
            )}
          </section>
        )}

        <section id="ledger" aria-labelledby="ledger-heading" className="scroll-mt-6">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-(--p-ink) pb-2">
            <h2 id="ledger-heading" className="text-base font-semibold">Cost center ledger</h2>
            <p className="text-xs text-(--p-ink-3)">Committed solid · pending hatched · 80% review mark</p>
          </div>
          <div className="overflow-x-auto">
            <table className="p-figures w-full min-w-[48rem] text-sm">
              <thead>
                <tr>
                  <th scope="col" className={th}>Cost center</th>
                  <th scope="col" className={cn(th, "w-[30%]")}><span className="sr-only">Utilization</span></th>
                  <th scope="col" className={cn(th, "text-right")}>Allocated</th>
                  <th scope="col" className={cn(th, "text-right")}>Committed</th>
                  <th scope="col" className={cn(th, "text-right")}>Pending</th>
                  <th scope="col" className={cn(th, "text-right")}>Available</th>
                </tr>
              </thead>
              <tbody>
                {costCenters.map((c) => {
                  const pending = metrics.pendingByCenter.get(c.id) ?? 0;
                  const over = c.availableBudgetMinor < 0;
                  return (
                    <tr key={c.id} className={over ? "bg-(--p-violation-soft)" : undefined}>
                      <th scope="row" className={cn(td, "text-left font-normal")}>
                        <span className="block font-medium">{c.name}</span>
                        <span className="text-xs text-(--p-ink-3)" translate="no">{c.code}</span>
                      </th>
                      <td className={cn(td, "pt-4")}><BulletA allocatedMinor={c.allocatedBudgetMinor} committedMinor={c.committedBudgetMinor} pendingMinor={pending} /></td>
                      <td className={cn(td, "text-right")}>{formatUsd(c.allocatedBudgetMinor)}</td>
                      <td className={cn(td, "text-right")}>{formatUsd(c.committedBudgetMinor)}</td>
                      <td className={cn(td, "text-right text-(--p-ink-3)")}>{formatUsd(pending)}</td>
                      <td className={cn(td, "text-right text-base font-semibold", over && "text-(--p-violation)")}>{formatUsd(c.availableBudgetMinor)}</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <th scope="row" className="px-3 py-2.5 text-left">Total</th>
                  <td />
                  <td className="px-3 py-2.5 text-right">{formatUsd(metrics.allocatedMinor)}</td>
                  <td className="px-3 py-2.5 text-right">{formatUsd(metrics.committedMinor)}</td>
                  <td className="px-3 py-2.5 text-right text-(--p-ink-3)">{formatUsd(metrics.pendingMinor)}</td>
                  <td className="px-3 py-2.5 text-right">{formatUsd(metrics.availableMinor)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
            {approver && (
              <section id="decisions" aria-labelledby="decisions-heading" className="scroll-mt-6">
                <h2 id="decisions-heading" className="border-b-2 border-(--p-ink) pb-2 text-base font-semibold">Decision queue</h2>
                {metrics.queue.length === 0 && <p className="py-6 text-sm text-(--p-ink-3)">Nothing is waiting for a decision.</p>}
                {groups.filter((g) => g.items.length).map((group) => (
                  <div key={group.key} className="mt-5">
                    <h3 className="text-sm font-semibold">{group.title} <span className="p-figures font-normal text-(--p-ink-3)">· {group.items.length}</span></h3>
                    <p className="text-xs text-(--p-ink-3)">{group.note}</p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="p-figures w-full min-w-[40rem] text-sm">
                        <tbody>
                          {group.items.map((p) => (
                            <tr key={p.id}>
                              <td className={cn(td, "w-24 text-xs text-(--p-ink-3)")} translate="no">{ref(p.id)}</td>
                              <th scope="row" className={cn(td, "text-left font-normal")}>
                                <Link href={detailHref(p.id)} className="font-medium hover:text-(--p-accent) hover:underline">{p.title}</Link>
                                <span className="block text-xs text-(--p-ink-3)">{p.costCenterName} · waiting {waitingDays(p.createdAt, asOf)}</span>
                              </th>
                              <td className={cn(td, "text-right font-semibold")}>{formatUsd(p.amountMinor)}</td>
                              <td className={cn(td, "w-24 text-right")}>
                                <Link href={detailHref(p.id)} className="text-sm font-semibold text-(--p-accent) hover:underline">Review</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section id="requests" aria-labelledby="requests-heading" className="scroll-mt-6">
              <h2 id="requests-heading" className="border-b-2 border-(--p-ink) pb-2 text-base font-semibold">
                {session.role === "REQUESTER" ? "Your requests" : auditor ? "Requests and outcomes" : "All requests"}
              </h2>
              {purchases.length === 0 ? (
                <p className="py-6 text-sm text-(--p-ink-3)">No purchase requests yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="p-figures w-full min-w-[40rem] text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className={th}>Reference</th>
                        <th scope="col" className={th}>Request</th>
                        <th scope="col" className={th}>Status</th>
                        <th scope="col" className={cn(th, "text-right")}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.slice(0, 12).map((p) => (
                        <tr key={p.id}>
                          <td className={cn(td, "w-24 text-xs text-(--p-ink-3)")} translate="no">{ref(p.id)}</td>
                          <th scope="row" className={cn(td, "text-left font-normal")}>
                            <Link href={detailHref(p.id)} className="font-medium hover:text-(--p-accent) hover:underline">{p.title}</Link>
                            <span className="block text-xs text-(--p-ink-3)">{p.costCenterCode} · submitted {formatUtcShortDate(p.createdAt)}</span>
                          </th>
                          <td className={td}><StatusText status={p.status} /></td>
                          <td className={cn(td, "text-right")}>{formatUsd(p.amountMinor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {purchases.length > 12 && <p className="pt-2 text-xs text-(--p-ink-3)">Showing 12 of {purchases.length}. A full requests page is planned (UX-VS-05).</p>}
                </div>
              )}
            </section>
          </div>

          <aside className="grid gap-6 xl:sticky xl:top-6" aria-label="Summary">
            {approver && (
              <section className="rounded-lg border border-(--p-line) bg-(--p-surface) p-5">
                <h2 className="text-sm font-semibold">Pending exposure</h2>
                <dl className="p-figures mt-3 grid gap-2.5 text-sm">
                  {groups.map((g) => (
                    <div key={g.key} className="flex justify-between gap-3">
                      <dt className="text-(--p-ink-2)">{g.title}</dt>
                      <dd className="font-medium">{formatUsd(g.items.reduce((s, p) => s + p.amountMinor, 0))}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-(--p-ink-3)">Preliminary, from balances at page load. The server rechecks authority and budget on every decision.</p>
              </section>
            )}
            {session.role === "REQUESTER" && (
              <section className="rounded-lg border border-(--p-line) bg-(--p-surface) p-5">
                <h2 className="text-sm font-semibold">Raise a purchase request</h2>
                <p className="mt-1 text-sm text-(--p-ink-2)">Choose a cost center, describe the need and the amount. An approver in your tenant decides it.</p>
                <Link href="/?variant=0#new-request" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-(--p-accent) px-4 text-sm font-semibold text-white hover:bg-(--p-accent-hover)">
                  New purchase request
                </Link>
                <p className="mt-2 text-xs text-(--p-ink-3)">Prototypes are read-only; this opens the current form.</p>
              </section>
            )}
            {(auditor || approver) && (
              <section className="rounded-lg border border-(--p-line) bg-(--p-surface) p-5">
                <h2 className="text-sm font-semibold">Ledger integrity</h2>
                <ul className="mt-3 grid gap-2 text-sm">
                  {metrics.integrity.map((c) => (
                    <li key={c.id} className="flex justify-between gap-3">
                      <span translate="no">{c.code}</span>
                      <span className={cn("text-right", c.overAllocationMinor > 0 || c.reconciliationDeltaMinor !== 0 ? "font-medium text-(--p-violation)" : "text-(--p-ink-2)")}>
                        {c.overAllocationMinor > 0 ? `Over by ${formatUsd(c.overAllocationMinor)}` : c.reconciliationDeltaMinor !== 0 ? "Does not reconcile" : "Within allocation · reconciled"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-(--p-ink-3)">{status.kind === "clear" ? "Computed per cost center from current balances (INV-01)." : "Exceptions are computed per cost center (INV-01)."}</p>
              </section>
            )}
            {auditor && (
              <section id="trail" className="rounded-lg border border-(--p-line) bg-(--p-surface) p-5">
                <h2 className="text-sm font-semibold">Recent audit events</h2>
                <ol className="mt-3 grid gap-3 text-sm">
                  {data.recentTrails.flatMap(({ request, events }) => events.map((event) => ({ request, event })))
                    .toSorted((a, b) => b.event.occurredAt.getTime() - a.event.occurredAt.getTime())
                    .slice(0, 8)
                    .map(({ request, event }) => (
                      <li key={event.id} className="grid gap-0.5">
                        <span className="font-medium">{event.type === "CREATED" ? "Submitted" : event.type === "APPROVED" ? "Approved" : "Rejected"} · {event.actorName}</span>
                        <Link href={detailHref(request.id)} className="truncate text-(--p-ink-2) hover:underline">{request.title}</Link>
                        <time className="text-xs text-(--p-ink-3)" dateTime={event.occurredAt.toISOString()}>{formatUtcTimestamp(event.occurredAt)}</time>
                      </li>
                    ))}
                </ol>
                <p className="mt-3 text-xs text-(--p-ink-3)">From the trails of the most recently updated requests. A tenant-wide feed needs a read model (UX-VS-06).</p>
              </section>
            )}
          </aside>
        </div>
      </div>
    </ShellA>
  );
}
