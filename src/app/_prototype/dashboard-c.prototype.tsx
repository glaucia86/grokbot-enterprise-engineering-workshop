/* PROTOTYPE Variant C — Editorial Financial Intelligence: a computed daily brief, then editorial columns. */
import Link from "next/link";
import { integrityStatus } from "../_components/dashboard-metrics";
import { cn } from "../_components/ui";
import { formatUsd, formatUtcShortDate } from "../format-purchase";
import { approverQueue, asOfLabel, percent, plural, references, statusLabel, waitingDays, type DashboardData } from "./data";
import { RuleChart, ShellC } from "./shell-c";

export function DashboardC({ data }: { data: DashboardData }) {
  const { session, purchases, costCenters, metrics, asOf } = data;
  const ref = references(purchases.map((p) => p.id));
  const integrity = integrityStatus(metrics);
  const approver = session.role === "APPROVER";
  const groups = approver ? approverQueue(purchases, costCenters, session.approvalLimitMinor) : [];
  const pending = purchases.filter((p) => p.status === "PENDING").toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const decided = purchases.filter((p) => p.status !== "PENDING").toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const tightest = costCenters.toSorted((a, b) => percent(b.committedBudgetMinor, b.allocatedBudgetMinor) - percent(a.committedBudgetMinor, a.allocatedBudgetMinor))[0];
  const href = (id: string) => `/requests/${id}?variant=C`;

  const lead = approver
    ? `${plural(pending.length, "request")} worth ${formatUsd(metrics.pendingMinor)} ${pending.length === 1 ? "is" : "are"} waiting for your decision. ${groups[0].items.length} can be approved within today's budget${groups[2].items.length ? `; ${groups[2].items.length} need${groups[2].items.length === 1 ? "s" : ""} higher authority` : ""}.`
    : session.role === "REQUESTER"
      ? `You have ${plural(pending.length, "request")} waiting for a decision and ${decided.length} decided.`
      : integrity.kind === "clear"
        ? "Every cost center is within its allocation, and committed budget equals approved requests."
        : integrity.kind === "over-allocation"
          ? `${integrity.centers.map((c) => c.name).join(", ")} ${integrity.centers.length === 1 ? "is" : "are"} over allocation by ${formatUsd(integrity.centers.reduce((s, c) => s + c.overAllocationMinor, 0))}.`
          : "Committed budget does not match approved requests in at least one cost center.";

  return (
    <ShellC
      session={session}
      identities={data.identities}
      asOf={asOf}
      sections={[{ href: "#brief", label: "Brief" }, { href: "#decisions", label: approver ? "Decisions" : "Requests" }, { href: "#ledger", label: "Ledger" }, { href: "#changes", label: "What changed" }]}
    >
      <section id="brief" aria-labelledby="brief-heading" className="max-w-4xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-(--p-gold-ink)">THE BRIEF</p>
        <h1 id="brief-heading" className={cn("p-serif-c mt-3 text-[2.25rem] leading-[1.12] sm:text-[3rem]", integrity.kind !== "clear" && !approver && session.role !== "REQUESTER" && "text-(--p-violation)")}>{lead}</h1>
        <p className="mt-4 text-sm text-(--p-ink-3)">
          As of {asOfLabel(asOf)}, from the tenant ledger.
          {tightest && <> The tightest budget is {tightest.name}, at {percent(tightest.committedBudgetMinor, tightest.allocatedBudgetMinor)}% committed with {formatUsd(tightest.availableBudgetMinor)} left.</>}
        </p>
        {metrics.overspentCenters.length > 0 && (
          <p role="alert" className="mt-4 border-l-2 border-(--p-violation) pl-3 text-sm text-(--p-violation)">
            {metrics.overspentCenters.map((c) => `${c.code} has committed ${formatUsd(c.committedBudgetMinor)} against ${formatUsd(c.allocatedBudgetMinor)} allocated.`).join(" ")}
          </p>
        )}
        {approver && pending[0] && (
          <Link href={href((groups[0].items[0] ?? pending[0]).id)} className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-(--p-accent) px-6 text-sm font-semibold tracking-wide text-white hover:bg-(--p-accent-hover)">
            Review the next request
          </Link>
        )}
        {session.role === "REQUESTER" && (
          <Link href="/?variant=0#new-request" className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-(--p-accent) px-6 text-sm font-semibold tracking-wide text-white hover:bg-(--p-accent-hover)">
            Raise a purchase request
          </Link>
        )}
      </section>

      <div className="mt-12 grid gap-10 border-t border-(--p-ink) pt-8 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-(--p-line)">
        <section id="decisions" aria-labelledby="decisions-heading" className="lg:pr-8">
          <h2 id="decisions-heading" className="p-serif-c text-[1.625rem]">{approver ? "Needs your decision" : session.role === "REQUESTER" ? "Your requests" : "Awaiting decision"}</h2>
          {(approver ? groups.filter((g) => g.items.length) : [{ key: "pending", title: "", note: "", items: pending }]).map((group) => (
            <div key={group.key} className="mt-4">
              {group.title && <h3 className="text-xs font-semibold tracking-[0.08em] text-(--p-ink-3)">{group.title.toUpperCase()}</h3>}
              <ol className="mt-1">
                {group.items.map((p) => (
                  <li key={p.id} className="border-b border-(--p-line) py-3">
                    <Link href={href(p.id)} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
                      <span className="font-medium group-hover:underline">{p.title}</span>
                      <span className="p-figures font-semibold">{formatUsd(p.amountMinor)}</span>
                      <span className="text-xs text-(--p-ink-3)"><span translate="no">{ref(p.id)}</span> · {p.costCenterName} · waiting {waitingDays(p.createdAt, asOf)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {pending.length === 0 && <p className="mt-4 text-sm text-(--p-ink-3)">Nothing is waiting.</p>}
        </section>

        <section id="ledger" aria-labelledby="ledger-heading" className="lg:px-8">
          <h2 id="ledger-heading" className="p-serif-c text-[1.625rem]">Where the money is</h2>
          <ol className="mt-4 grid gap-6">
            {costCenters.map((c, index) => {
              const pendingAmount = metrics.pendingByCenter.get(c.id) ?? 0;
              return (
                <li key={c.id}>
                  <figure>
                    <RuleChart allocatedMinor={c.allocatedBudgetMinor} committedMinor={c.committedBudgetMinor} pendingMinor={pendingAmount} />
                    <figcaption className="p-figures mt-2 text-sm">
                      <span className="text-xs text-(--p-ink-3)">Fig. {index + 1} · </span>
                      <span className="font-medium">{c.name}</span> — {formatUsd(c.committedBudgetMinor)} committed of {formatUsd(c.allocatedBudgetMinor)};{" "}
                      <span className={c.availableBudgetMinor < 0 ? "font-semibold text-(--p-violation)" : "font-semibold"}>{formatUsd(c.availableBudgetMinor)}</span> available
                      {pendingAmount > 0 && <>, {formatUsd(pendingAmount)} pending</>}.
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="changes" aria-labelledby="changes-heading" className="lg:pl-8">
          <h2 id="changes-heading" className="p-serif-c text-[1.625rem]">What changed</h2>
          <ol className="mt-4">
            {decided.slice(0, 7).map((p) => (
              <li key={p.id} className="border-b border-(--p-line) py-3 text-sm">
                <span className={cn("font-semibold", p.status === "APPROVED" ? "text-(--p-approved)" : "text-(--p-violation)")}>{statusLabel[p.status]}</span>
                {" — "}
                <Link href={href(p.id)} className="hover:underline">{p.title}</Link>, <span className="p-figures">{formatUsd(p.amountMinor)}</span>
                <span className="block text-xs text-(--p-ink-3)">{formatUtcShortDate(p.updatedAt)} · {p.costCenterCode}</span>
              </li>
            ))}
            {decided.length === 0 && <li className="text-sm text-(--p-ink-3)">No decisions yet.</li>}
          </ol>
        </section>
      </div>

      <details className="mt-12 border-t border-(--p-line) pt-4 text-sm text-(--p-ink-2)">
        <summary className="cursor-pointer text-xs font-semibold tracking-[0.08em] text-(--p-ink-3)">HOW THESE FIGURES ARE COMPUTED</summary>
        <p className="mt-2 max-w-prose">Each cost center is checked on its own: committed must not exceed allocated (INV-01, INV-02), and committed must equal the approved requests in that cost center. Queue groups are preliminary; the server rechecks authority and budget on every decision.</p>
      </details>
    </ShellC>
  );
}
