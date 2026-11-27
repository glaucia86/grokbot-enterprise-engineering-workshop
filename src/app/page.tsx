import Link from "next/link";
import type { ReactNode } from "react";
import { purchaseStatuses, type PurchaseStatus } from "../modules/procurement/domain/procurement";
import { listLabIdentities, readLabSession } from "../server/auth/lab-session";
import { isLabEnabled } from "../server/db/lab-config";
import { requests } from "../server/procurement/requests";
import { AppShell } from "./_components/app-shell";
import { BudgetBar } from "./_components/budget-bar";
import { dashboardMetrics } from "./_components/dashboard-metrics";
import { DecisionMix, DecisionQueue, LedgerReconciliation } from "./_components/dashboard-panels";
import {
  CaretRightIcon,
  CheckCircleIcon,
  FileTextIcon,
  HourglassMediumIcon,
  LockSimpleIcon,
  PencilSimpleLineIcon,
  ReceiptIcon,
  WalletIcon,
  WarningIcon,
} from "./_components/icons";
import { Landing } from "./_components/landing";
import { StatusBadge } from "./_components/status-badge";
import { card, cardHeader, cardTitle, chip, cn } from "./_components/ui";
import { computeUtilizationPercent, formatUsd, formatUtcShortDate } from "./format-purchase";
import { LabIdentityForm } from "./lab-identity-form";
import { PurchaseRequestForm } from "./purchase-request-form";

export const dynamic = "force-dynamic";

function parseStatusFilter(value: string | string[] | undefined): PurchaseStatus | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return purchaseStatuses.includes(candidate as PurchaseStatus) ? (candidate as PurchaseStatus) : undefined;
}

function Kpi({ label, icon, value, tone = "default", children }: {
  label: string;
  icon: ReactNode;
  value: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-1.5 bg-surface px-5 py-4", tone === "danger" && "bg-danger-soft")}>
      <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-3">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[1.5rem] leading-tight font-semibold tracking-[-0.03em] tabular-nums",
          tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </span>
      <div className="text-xs text-ink-3">{children}</div>
    </div>
  );
}

const thClass = "border-b border-line bg-subtle px-4 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-3";
const tdClass = "border-b border-line px-4 py-3 align-middle";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const enabled = isLabEnabled();
  const [resolvedParams, identities, session] = await Promise.all([
    searchParams,
    enabled ? listLabIdentities() : Promise.resolve([]),
    enabled ? readLabSession() : Promise.resolve(undefined),
  ]);

  if (!session) {
    return <Landing enabled={enabled} identities={[...identities]} />;
  }

  const activeFilter = parseStatusFilter(resolvedParams.status);
  const [allPurchases, costCenters] = await Promise.all([
    requests.list(session),
    requests.listCostCenters(session),
  ]);

  const metrics = dashboardMetrics(allPurchases, costCenters, session.approvalLimitMinor);
  const purchases = activeFilter ? allPurchases.filter((p) => p.status === activeFilter) : allPurchases;
  const counts = {
    ALL: allPurchases.length,
    PENDING: metrics.byStatus.PENDING.count,
    APPROVED: metrics.byStatus.APPROVED.count,
    REJECTED: metrics.byStatus.REJECTED.count,
  };
  const utilization = computeUtilizationPercent(metrics.allocatedMinor, metrics.committedMinor);
  const headroomNegative = metrics.availableMinor < 0;
  const isRequester = session.role === "REQUESTER";
  const tenantWide = !isRequester;

  const sectionLinks = [
    { href: "#budgets", label: "Cost center budgets" },
    { href: "#requests", label: isRequester ? "My requests" : "Tenant requests" },
    ...(session.role === "APPROVER" ? [{ href: "#queue", label: "Decision queue" }] : []),
    ...(isRequester ? [{ href: "#new-request", label: "New purchase request" }] : []),
  ];

  return (
    <AppShell session={session} section="dashboard" sectionLinks={sectionLinks}>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-3">
            <span>Workspace</span>
            <CaretRightIcon size={11} aria-hidden="true" />
            <span aria-current="page" className="text-ink-2">Dashboard</span>
          </nav>
          <h1 className="mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-ink" translate="no">
            {session.tenantName}
          </h1>
          <p className="session-state mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-2">
            <span>
              <strong className="font-semibold text-ink">{session.tenantName}</strong> · {session.displayName} · {session.role}
            </span>
            {session.role === "APPROVER" && session.approvalLimitMinor !== null && (
              <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink-2">
                <LockSimpleIcon size={12} aria-hidden="true" />
                Approval limit <span className="font-mono tabular-nums">{formatUsd(session.approvalLimitMinor)}</span>
              </span>
            )}
          </p>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[26rem]">
          <LabIdentityForm identities={[...identities]} selected={session.key ?? undefined} />
        </div>
      </header>

      {metrics.overspentCenters.length > 0 && (
        <section
          className="mt-6 flex flex-wrap items-start gap-4 rounded-xl border border-danger-line border-l-4 border-l-danger-solid bg-danger-soft px-5 py-4"
          role="alert"
          aria-label="Financial invariant violation"
        >
          <WarningIcon size={22} weight="fill" className="mt-0.5 shrink-0 text-danger-solid" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-danger">Financial Invariant Violation Detected (INV-01 / INV-02 · PH-42)</p>
            <p className="mt-1 text-sm text-ink-2">
              {metrics.overspentCenters.map((center) => (
                <span key={center.id}>
                  Cost center <strong translate="no">{center.code}</strong> ({center.name}) has{" "}
                  <strong className="font-mono tabular-nums">{formatUsd(center.committedBudgetMinor)}</strong> committed against{" "}
                  <strong className="font-mono tabular-nums">{formatUsd(center.allocatedBudgetMinor)}</strong> allocated (deficit{" "}
                  <strong className="font-mono tabular-nums text-danger">{formatUsd(center.availableBudgetMinor)}</strong>).{" "}
                </span>
              ))}
            </p>
          </div>
          <a
            href={"#cc-" + metrics.overspentCenters[0].code}
            className="inline-flex min-h-9 items-center rounded-lg bg-danger-solid px-3 text-sm font-semibold text-white hover:brightness-110"
          >
            Inspect ledger
          </a>
        </section>
      )}

      <section
        aria-label="Tenant financial summary"
        className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi label="Total allocated" icon={<WalletIcon size={16} />} value={formatUsd(metrics.allocatedMinor)}>
          {costCenters.length} active cost centers
        </Kpi>
        <Kpi label="Total committed" icon={<ReceiptIcon size={16} />} value={formatUsd(metrics.committedMinor)}>
          <div className="grid gap-1.5">
            <BudgetBar allocatedMinor={metrics.allocatedMinor} committedMinor={metrics.committedMinor} size="sm" />
            <span>{utilization}% of allocated budget</span>
          </div>
        </Kpi>
        <Kpi
          label="Available headroom"
          icon={<CheckCircleIcon size={16} />}
          value={formatUsd(metrics.availableMinor)}
          tone={headroomNegative ? "danger" : "default"}
        >
          <span className={cn("inline-flex items-center gap-1", headroomNegative ? "text-danger" : "text-success")}>
            {headroomNegative ? <WarningIcon size={13} aria-hidden="true" /> : <CheckCircleIcon size={13} aria-hidden="true" />}
            {headroomNegative ? "Negative budget — INV-02 violated" : "Non-negative invariant satisfied"}
          </span>
        </Kpi>
        <Kpi label={isRequester ? "My pending exposure" : "Pending exposure"} icon={<HourglassMediumIcon size={16} />} value={formatUsd(metrics.pendingMinor)}>
          {counts.PENDING} awaiting decision ·{" "}
          <span className={cn("font-mono tabular-nums", metrics.headroomAfterPendingMinor < 0 && "font-semibold text-warning")}>
            {formatUsd(metrics.headroomAfterPendingMinor)}
          </span>{" "}
          headroom if all approved
        </Kpi>
      </section>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <section id="budgets" className={card} aria-labelledby="budgets-heading">
            <div className={cardHeader}>
              <div>
                <h2 id="budgets-heading" className={cardTitle}>Cost center budgets</h2>
                <p className="mt-0.5 text-[0.8125rem] text-ink-3">
                  Real-time PostgreSQL ledger balances for {session.tenantName} in exact USD minor units.
                </p>
              </div>
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3" aria-label="Chart legend">
                <li className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-accent-solid" aria-hidden="true" />Committed</li>
                <li className="flex items-center gap-1.5"><span className="hatch h-2 w-3 rounded-sm text-accent/45" aria-hidden="true" />{isRequester ? "My pending" : "Pending"}</li>
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-px bg-ink-3" aria-hidden="true" />80% review line</li>
              </ul>
            </div>
            {costCenters.length === 0 ? (
              <div className="grid justify-items-center gap-1 px-5 py-10 text-center">
                <WalletIcon size={28} weight="duotone" className="text-ink-3" aria-hidden="true" />
                <p className="text-sm font-medium text-ink">No cost centers configured</p>
                <p className="text-xs text-ink-3">Run lab initialization to seed departmental budgets for this tenant.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className={thClass}>Cost center</th>
                      <th scope="col" className={cn(thClass, "w-[32%]")}>Utilization</th>
                      <th scope="col" className={cn(thClass, "text-right")}>Allocated</th>
                      <th scope="col" className={cn(thClass, "text-right")}>Committed</th>
                      <th scope="col" className={cn(thClass, "text-right")}>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costCenters.map((center) => {
                      const pct = computeUtilizationPercent(center.allocatedBudgetMinor, center.committedBudgetMinor);
                      const pending = metrics.pendingByCenter.get(center.id) ?? 0;
                      const overspent = center.availableBudgetMinor < 0;
                      return (
                        <tr
                          key={center.id}
                          id={"cc-" + center.code}
                          data-cost-center-code={center.code}
                          className={cn("transition-colors duration-150 hover:bg-subtle target:bg-danger-soft", overspent && "bg-danger-soft/60")}
                        >
                          <td className={cn(tdClass, overspent && "shadow-[inset_3px_0_0_var(--danger-solid)]")}>
                            <div className="grid justify-items-start gap-1">
                              <span className="font-medium whitespace-nowrap text-ink">{center.name}</span>
                              <span className={chip} translate="no">{center.code}</span>
                            </div>
                          </td>
                          <td className={tdClass}>
                            <div className="grid gap-1.5">
                              <BudgetBar allocatedMinor={center.allocatedBudgetMinor} committedMinor={center.committedBudgetMinor} pendingMinor={pending} />
                              <div className="flex justify-between gap-2 text-xs text-ink-3">
                                <span className={cn(overspent ? "font-semibold text-danger" : pct >= 80 ? "font-semibold text-warning" : undefined)}>
                                  {overspent ? "Exceeded" : pct >= 80 ? "High" : "Healthy"} · <span className="font-mono tabular-nums">{pct}%</span>
                                </span>
                                {pending > 0 && <span className="font-mono tabular-nums">+{formatUsd(pending)} pending</span>}
                              </div>
                            </div>
                          </td>
                          <td className={cn(tdClass, "text-right font-mono tabular-nums")}>{formatUsd(center.allocatedBudgetMinor)}</td>
                          <td className={cn(tdClass, "text-right font-mono tabular-nums")}>{formatUsd(center.committedBudgetMinor)}</td>
                          <td className={cn(tdClass, "text-right font-mono tabular-nums", overspent ? "font-semibold text-danger" : "text-ink")}>
                            {formatUsd(center.availableBudgetMinor)}
                            {overspent && (
                              <span className="ml-2 rounded-full bg-danger-solid px-1.5 py-0.5 font-sans text-[0.625rem] font-bold tracking-[0.06em] text-white">
                                OVERSPENT
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="requests" className={card} aria-labelledby="requests-heading">
            <div className={cardHeader}>
              <div>
                <h2 id="requests-heading" className={cardTitle}>{isRequester ? "My requests" : "Tenant requests"}</h2>
                <p className="mt-0.5 text-[0.8125rem] text-ink-3">
                  {isRequester
                    ? "Requests scoped strictly to your identity in this tenant."
                    : `Full ${session.tenantName} procurement queue with audit traceability.`}
                </p>
              </div>
              <nav
                className="flex flex-wrap items-center gap-0.5 rounded-lg border border-line bg-muted p-0.5"
                aria-label="Filter requests by status"
              >
                {([undefined, ...purchaseStatuses] as (PurchaseStatus | undefined)[]).map((status) => {
                  const active = activeFilter === status;
                  return (
                    <Link
                      key={status ?? "ALL"}
                      href={status ? `/?status=${status}` : "/"}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition-colors duration-150",
                        active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
                      )}
                    >
                      {status ? status[0] + status.slice(1).toLowerCase() : "All"}
                      <span className={cn("font-mono text-[0.6875rem] tabular-nums", active ? "text-accent" : "text-ink-3")}>
                        {counts[status ?? "ALL"]}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {purchases.length === 0 ? (
              <div className="grid justify-items-center gap-1 px-5 py-12 text-center">
                <FileTextIcon size={28} weight="duotone" className="text-ink-3" aria-hidden="true" />
                <p className="text-sm font-medium text-ink">
                  {activeFilter ? `No ${activeFilter.toLowerCase()} purchase requests` : "No purchase requests yet"}
                </p>
                <p className="max-w-sm text-xs text-ink-3">
                  {activeFilter
                    ? "Switch filters above to inspect requests in another workflow state."
                    : isRequester
                      ? "Submit your first purchase request using the form on the right."
                      : "Switch to a Requester identity to submit a purchase request for review."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className={thClass}>Request</th>
                      <th scope="col" className={thClass}>Cost center</th>
                      <th scope="col" className={cn(thClass, "text-right")}>Amount</th>
                      <th scope="col" className={thClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="group transition-colors duration-150 hover:bg-subtle">
                        <td className={cn(tdClass, "max-w-0 w-[52%]")}>
                          <Link
                            className="block truncate font-medium text-ink group-hover:text-accent"
                            href={"/requests/" + purchase.id}
                            prefetch={false}
                          >
                            {purchase.title}
                          </Link>
                          <span className="text-xs text-ink-3">Submitted {formatUtcShortDate(purchase.createdAt)}</span>
                        </td>
                        <td className={tdClass}><span className={chip} translate="no">{purchase.costCenterCode}</span></td>
                        <td className={cn(tdClass, "text-right font-mono tabular-nums text-ink")}>{formatUsd(purchase.amountMinor)}</td>
                        <td className={tdClass}><StatusBadge status={purchase.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="grid min-w-0 grid-cols-1 gap-6 xl:sticky xl:top-8" aria-label="Role workspace">
          {isRequester && (
            <section id="new-request" className={card} aria-labelledby="create-heading">
              <div className={cardHeader}>
                <div className="flex items-center gap-2">
                  <PencilSimpleLineIcon size={18} className="text-ink-3" aria-hidden="true" />
                  <h2 id="create-heading" className={cardTitle}>New purchase request</h2>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="mb-4 text-[0.8125rem] text-ink-3">Creates a PENDING request and an atomic CREATED audit event.</p>
                <PurchaseRequestForm
                  costCenters={costCenters.map(({ id, code, name, allocatedBudgetMinor, committedBudgetMinor, availableBudgetMinor }) => ({
                    id,
                    code,
                    name,
                    allocatedBudgetMinor,
                    committedBudgetMinor,
                    availableBudgetMinor,
                  }))}
                />
              </div>
            </section>
          )}
          {session.role === "APPROVER" && session.approvalLimitMinor !== null && (
            <DecisionQueue metrics={metrics} approvalLimitMinor={session.approvalLimitMinor} />
          )}
          {tenantWide && <LedgerReconciliation metrics={metrics} />}
          <DecisionMix metrics={metrics} />
        </aside>
      </div>
    </AppShell>
  );
}
