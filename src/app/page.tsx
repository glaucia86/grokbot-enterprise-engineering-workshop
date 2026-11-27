import Link from "next/link";
import { purchaseStatuses, type PurchaseStatus } from "../modules/procurement/domain/procurement";
import { listLabIdentities, readLabSession } from "../server/auth/lab-session";
import { isLabEnabled } from "../server/db/lab-config";
import { requests } from "../server/procurement/requests";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BuildingIcon,
  ClockIcon,
  FileCheckIcon,
  LockIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "./_components/icons";
import { computeUtilizationPercent, formatUsd } from "./format-purchase";
import { LabIdentityForm } from "./lab-identity-form";
import { PurchaseRequestForm } from "./purchase-request-form";

export const dynamic = "force-dynamic";

function parseStatusFilter(value: string | string[] | undefined): PurchaseStatus | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return purchaseStatuses.includes(candidate as PurchaseStatus) ? (candidate as PurchaseStatus) : undefined;
}

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

  const activeFilter = parseStatusFilter(resolvedParams.status);
  const [allPurchases, costCenters] = session
    ? await Promise.all([requests.list(session), requests.listCostCenters(session)])
    : [[], []];

  const purchases = activeFilter ? allPurchases.filter((p) => p.status === activeFilter) : allPurchases;
  const counts = {
    ALL: allPurchases.length,
    PENDING: allPurchases.filter((p) => p.status === "PENDING").length,
    APPROVED: allPurchases.filter((p) => p.status === "APPROVED").length,
    REJECTED: allPurchases.filter((p) => p.status === "REJECTED").length,
  };

  const totalAllocated = costCenters.reduce((acc, c) => acc + c.allocatedBudgetMinor, 0);
  const totalCommitted = costCenters.reduce((acc, c) => acc + c.committedBudgetMinor, 0);
  const totalAvailable = totalAllocated - totalCommitted;
  const totalUtilPct = computeUtilizationPercent(totalAllocated, totalCommitted);
  const overspentCenters = costCenters.filter((c) => c.availableBudgetMinor < 0);

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="brand-group">
            <span className="brand-mark"><ShieldCheckIcon size={20} /></span>
            <div className="brand-text">
              <h1 className="brand-title">Procurement Hub</h1>
              <span className="env-badge" translate="no">Synthetic Enterprise Lab</span>
            </div>
          </div>
          <div className="topbar-actions">
            <a className="health-link" href="/api/health">
              <span className="health-dot" aria-hidden="true" />
              <ActivityIcon size={15} />
              Check lab readiness
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" className="stack">
        <section className="panel session-panel" aria-labelledby="session-heading">
          <div className="session-layout">
            <div className="session-meta">
              <h2 id="session-heading" className="session-label">Workshop session</h2>
              {session ? (
                <p className="session-state">
                  <BuildingIcon size={16} className="panel-icon" />
                  <span>
                    <strong>{session.tenantName}</strong> · {session.displayName} · {session.role}
                  </span>
                  {session.role === "APPROVER" && session.approvalLimitMinor !== null && (
                    <span className="session-limit-pill">
                      <LockIcon size={13} />
                      Approval limit {formatUsd(session.approvalLimitMinor)}
                    </span>
                  )}
                </p>
              ) : (
                <p className="session-state">
                  Select a synthetic tenant identity to explore budgets, approvals, and audit trails.
                </p>
              )}
            </div>
            {enabled ? (
              <LabIdentityForm identities={[...identities]} selected={session?.key ?? undefined} />
            ) : (
              <p>Enable the local lab profile and initialize the synthetic identities to continue.</p>
            )}
          </div>
        </section>

        {session && overspentCenters.length > 0 && (
          <section className="invariant-alert" role="alert" aria-label="Financial invariant violation">
            <AlertTriangleIcon size={22} className="invariant-alert-icon" />
            <div>
              <p className="invariant-alert-title">
                Financial Invariant Violation Detected (INV-01 / INV-02 · PH-42)
              </p>
              <p className="invariant-alert-body">
                {overspentCenters.map((center) => (
                  <span key={center.id}>
                    Cost center <strong translate="no">{center.code}</strong> ({center.name}) has{" "}
                    <strong className="mono">{formatUsd(center.committedBudgetMinor)}</strong> committed against{" "}
                    <strong className="mono">{formatUsd(center.allocatedBudgetMinor)}</strong> allocated (deficit{" "}
                    <strong className="mono">{formatUsd(center.availableBudgetMinor)}</strong>).{" "}
                  </span>
                ))}
              </p>
            </div>
          </section>
        )}

        {session && (
          <>
            <section className="kpi-grid" aria-label="Tenant financial summary">
              <div className="kpi-card">
                <span className="kpi-label">Total allocated <WalletIcon size={15} /></span>
                <span className="kpi-value">{formatUsd(totalAllocated)}</span>
                <span className="kpi-sub">{costCenters.length} active cost centers</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Total committed <FileCheckIcon size={15} /></span>
                <span className="kpi-value">{formatUsd(totalCommitted)}</span>
                <span className="kpi-sub">{totalUtilPct}% of allocated budget</span>
              </div>
              <div className={totalAvailable < 0 ? "kpi-card kpi-card-danger" : "kpi-card"}>
                <span className="kpi-label">Available headroom <ShieldCheckIcon size={15} /></span>
                <span className={totalAvailable < 0 ? "kpi-value kpi-value-danger" : "kpi-value"}>
                  {formatUsd(totalAvailable)}
                </span>
                <span className="kpi-sub">
                  {totalAvailable < 0 ? "Negative budget — INV-02 violated" : "Non-negative invariant satisfied"}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Pending decisions <ClockIcon size={15} /></span>
                <span className="kpi-value">{counts.PENDING}</span>
                <span className="kpi-sub">{counts.APPROVED} approved · {counts.REJECTED} rejected</span>
              </div>
            </section>

            <section className="panel" aria-labelledby="budgets-heading">
              <div className="panel-header">
                <div>
                  <div className="panel-heading-group">
                    <WalletIcon size={18} className="panel-icon" />
                    <h2 id="budgets-heading">Cost center budgets</h2>
                  </div>
                  <p className="panel-subtitle">
                    Real-time PostgreSQL ledger balances for {session.tenantName} in exact USD minor units.
                  </p>
                </div>
              </div>
              {costCenters.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state-title">No cost centers configured</p>
                  <p className="empty-state-body">Run lab initialization to seed departmental budgets for this tenant.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Code</th>
                        <th scope="col">Cost center</th>
                        <th scope="col">Utilization</th>
                        <th scope="col" className="num-col">Allocated</th>
                        <th scope="col" className="num-col">Committed</th>
                        <th scope="col" className="num-col">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costCenters.map((center) => {
                        const pct = computeUtilizationPercent(center.allocatedBudgetMinor, center.committedBudgetMinor);
                        const overspent = center.availableBudgetMinor < 0;
                        const highUtil = !overspent && pct >= 80;
                        const fillWidth = Math.min(100, Math.max(0, pct));
                        const fillClass = overspent
                          ? "meter-fill meter-fill-danger"
                          : highUtil
                            ? "meter-fill meter-fill-warning"
                            : "meter-fill";

                        return (
                          <tr key={center.id} data-cost-center-code={center.code}>
                            <td><span className="code-chip" translate="no">{center.code}</span></td>
                            <td><strong>{center.name}</strong></td>
                            <td className="meter-cell">
                              <div className="meter-header">
                                <span>{overspent ? "Exceeded" : highUtil ? "High" : "Healthy"}</span>
                                <span className="mono">{pct}%</span>
                              </div>
                              <div className="meter-track" aria-hidden="true">
                                <div className={fillClass} style={{ width: `${fillWidth}%` }} />
                              </div>
                            </td>
                            <td className="num-col amount">{formatUsd(center.allocatedBudgetMinor)}</td>
                            <td className="num-col amount">{formatUsd(center.committedBudgetMinor)}</td>
                            <td className={overspent ? "num-col amount budget-overspent" : "num-col amount"}>
                              {formatUsd(center.availableBudgetMinor)}
                              {overspent && <span className="overspent-tag">OVERSPENT</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="workspace">
              <section className="panel" aria-labelledby="requests-heading">
                <div className="panel-header">
                  <div>
                    <div className="panel-heading-group">
                      <FileCheckIcon size={18} className="panel-icon" />
                      <h2 id="requests-heading">{session.role === "REQUESTER" ? "My requests" : "Tenant requests"}</h2>
                    </div>
                    <p className="panel-subtitle">
                      {session.role === "REQUESTER"
                        ? "Requests scoped strictly to your identity in this tenant."
                        : `Full ${session.tenantName} procurement queue with audit traceability.`}
                    </p>
                  </div>
                  <nav className="filter-bar" aria-label="Filter requests by status">
                    <Link
                      href="/"
                      prefetch={false}
                      className={!activeFilter ? "filter-chip filter-chip-active" : "filter-chip"}
                    >
                      All <span className="filter-count">{counts.ALL}</span>
                    </Link>
                    {purchaseStatuses.map((status) => (
                      <Link
                        key={status}
                        href={`/?status=${status}`}
                        prefetch={false}
                        className={activeFilter === status ? "filter-chip filter-chip-active" : "filter-chip"}
                      >
                        {status[0] + status.slice(1).toLowerCase()}
                        <span className="filter-count">{counts[status]}</span>
                      </Link>
                    ))}
                  </nav>
                </div>

                {purchases.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state-title">
                      {activeFilter ? `No ${activeFilter.toLowerCase()} purchase requests` : "No purchase requests yet"}
                    </p>
                    <p className="empty-state-body">
                      {activeFilter
                        ? "Switch filters above to inspect requests in another workflow state."
                        : session.role === "REQUESTER"
                          ? "Submit your first purchase request using the form on the right."
                          : "Switch to a Requester identity to submit a purchase request for review."}
                    </p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Request</th>
                          <th scope="col">Cost center</th>
                          <th scope="col" className="num-col">Amount</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((purchase) => (
                          <tr key={purchase.id}>
                            <td>
                              <Link className="request-link" href={"/requests/" + purchase.id} prefetch={false}>
                                {purchase.title}
                              </Link>
                            </td>
                            <td><span className="code-chip" translate="no">{purchase.costCenterCode}</span></td>
                            <td className="num-col amount">{formatUsd(purchase.amountMinor)}</td>
                            <td>
                              <span className={"status status-" + purchase.status.toLowerCase()}>
                                {purchase.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {session.role === "REQUESTER" && (
                <section className="panel" aria-labelledby="create-heading">
                  <div className="panel-header">
                    <div>
                      <h2 id="create-heading">New purchase request</h2>
                      <p className="panel-subtitle">Creates a PENDING request and an atomic CREATED audit event.</p>
                    </div>
                  </div>
                  <PurchaseRequestForm
                    costCenters={costCenters.map(({ id, code, name, availableBudgetMinor }) => ({
                      id,
                      code,
                      name,
                      availableBudgetMinor,
                    }))}
                  />
                </section>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
