import Link from "next/link";
import { purchaseStatuses, type PurchaseStatus } from "../modules/procurement/domain/procurement";
import { listLabIdentities, readLabSession } from "../server/auth/lab-session";
import { isLabEnabled } from "../server/db/lab-config";
import { requests } from "../server/procurement/requests";
import { AppTopbar } from "./_components/app-topbar";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
  FileCheckIcon,
  LockIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "./_components/icons";
import { Landing } from "./_components/landing";
import { stagger } from "./_components/motion";
import { UtilizationRing, utilizationTone } from "./_components/utilization-ring";
import { computeUtilizationPercent, formatUsd } from "./format-purchase";
import { LabIdentityForm } from "./lab-identity-form";
import { PurchaseRequestForm } from "./purchase-request-form";

export const dynamic = "force-dynamic";

const meterLabels = { healthy: "Healthy", warning: "High", danger: "Exceeded" } as const;

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

  if (!session) {
    return <Landing enabled={enabled} identities={[...identities]} />;
  }

  const activeFilter = parseStatusFilter(resolvedParams.status);
  const [allPurchases, costCenters] = await Promise.all([
    requests.list(session),
    requests.listCostCenters(session),
  ]);

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
  const headroomNegative = totalAvailable < 0;

  return (
    <>
      <AppTopbar session={session} section="dashboard" />

      <main id="main-content" className="stack app-main">
        <section className="page-header reveal" aria-labelledby="workspace-heading">
          <div className="page-header-copy">
            <p className="eyebrow"><BuildingIcon size={14} />Tenant workspace</p>
            <h1 id="workspace-heading">{session.tenantName}</h1>
            <p className="session-state">
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
          </div>
          <div className="identity-switcher">
            <LabIdentityForm identities={[...identities]} selected={session.key ?? undefined} />
          </div>
        </section>

        {overspentCenters.length > 0 && (
          <section className="invariant-alert" role="alert" aria-label="Financial invariant violation">
            <span className="invariant-alert-badge" aria-hidden="true">
              <AlertTriangleIcon size={22} />
            </span>
            <div className="invariant-alert-copy">
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
            <a className="invariant-alert-action" href={"#cc-" + overspentCenters[0].code}>
              Inspect ledger <ArrowRightIcon size={15} />
            </a>
          </section>
        )}

        <section className="kpi-grid" aria-label="Tenant financial summary">
          <div className="kpi-card reveal" style={stagger(1)}>
            <span className="kpi-label">Total allocated <span className="kpi-icon"><WalletIcon size={15} /></span></span>
            <span className="kpi-value">{formatUsd(totalAllocated)}</span>
            <span className="kpi-sub">{costCenters.length} active cost centers</span>
          </div>
          <div className="kpi-card kpi-card-ring reveal" style={stagger(2)}>
            <span className="kpi-label">Total committed <span className="kpi-icon"><FileCheckIcon size={15} /></span></span>
            <div className="kpi-ring-row">
              <span className="kpi-value">{formatUsd(totalCommitted)}</span>
              <UtilizationRing percent={totalUtilPct} tone={utilizationTone(totalUtilPct, headroomNegative)} size={44} />
            </div>
            <span className="kpi-sub">{totalUtilPct}% of allocated budget</span>
          </div>
          <div className={headroomNegative ? "kpi-card kpi-card-danger reveal" : "kpi-card reveal"} style={stagger(3)}>
            <span className="kpi-label">Available headroom <span className="kpi-icon"><ShieldCheckIcon size={15} /></span></span>
            <span className={headroomNegative ? "kpi-value kpi-value-danger" : "kpi-value"}>
              {formatUsd(totalAvailable)}
            </span>
            <span className="kpi-sub">
              <span className={headroomNegative ? "kpi-dot kpi-dot-danger" : "kpi-dot kpi-dot-ok"} aria-hidden="true" />
              {headroomNegative ? "Negative budget — INV-02 violated" : "Non-negative invariant satisfied"}
            </span>
          </div>
          <div className="kpi-card reveal" style={stagger(4)}>
            <span className="kpi-label">Pending decisions <span className="kpi-icon"><ClockIcon size={15} /></span></span>
            <span className="kpi-value">{counts.PENDING}</span>
            <span className="kpi-sub">{counts.APPROVED} approved · {counts.REJECTED} rejected</span>
          </div>
        </section>

        <section className="panel reveal" style={stagger(5)} aria-labelledby="budgets-heading">
          <div className="panel-header">
            <div>
              <div className="panel-heading-group">
                <span className="panel-icon"><WalletIcon size={17} /></span>
                <h2 id="budgets-heading">Cost center budgets</h2>
              </div>
              <p className="panel-subtitle">
                Real-time PostgreSQL ledger balances for {session.tenantName} in exact USD minor units.
              </p>
            </div>
            <span className="live-badge"><span className="live-dot" aria-hidden="true" />Live ledger</span>
          </div>
          {costCenters.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true"><WalletIcon size={22} /></span>
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
                  {costCenters.map((center, index) => {
                    const pct = computeUtilizationPercent(center.allocatedBudgetMinor, center.committedBudgetMinor);
                    const overspent = center.availableBudgetMinor < 0;
                    const tone = utilizationTone(pct, overspent);

                    return (
                      <tr
                        key={center.id}
                        id={"cc-" + center.code}
                        data-cost-center-code={center.code}
                        className={overspent ? "row-danger" : undefined}
                      >
                        <td><span className="code-chip" translate="no">{center.code}</span></td>
                        <td><strong>{center.name}</strong></td>
                        <td className="meter-cell">
                          <div className="meter-header">
                            <span className={"meter-state meter-state-" + tone}>{meterLabels[tone]}</span>
                            <span className="mono">{pct}%</span>
                          </div>
                          <div className="meter-track" aria-hidden="true">
                            <div
                              className={"meter-fill meter-fill-" + tone}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%`, ...stagger(index) }}
                            />
                            <span className="meter-threshold" />
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
          <section className="panel reveal" style={stagger(6)} aria-labelledby="requests-heading">
            <div className="panel-header">
              <div>
                <div className="panel-heading-group">
                  <span className="panel-icon"><FileCheckIcon size={17} /></span>
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
                  aria-current={!activeFilter ? "page" : undefined}
                >
                  All <span className="filter-count">{counts.ALL}</span>
                </Link>
                {purchaseStatuses.map((status) => (
                  <Link
                    key={status}
                    href={`/?status=${status}`}
                    prefetch={false}
                    className={activeFilter === status ? "filter-chip filter-chip-active" : "filter-chip"}
                    aria-current={activeFilter === status ? "page" : undefined}
                  >
                    {status[0] + status.slice(1).toLowerCase()}
                    <span className="filter-count">{counts[status]}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {purchases.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon" aria-hidden="true"><FileCheckIcon size={22} /></span>
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
                <table className="requests-table">
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
                            <ArrowRightIcon size={14} className="request-link-arrow" />
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
            <section className="panel panel-form reveal" style={stagger(7)} aria-labelledby="create-heading">
              <div className="panel-header">
                <div>
                  <div className="panel-heading-group">
                    <span className="panel-icon"><WalletIcon size={17} /></span>
                    <h2 id="create-heading">New purchase request</h2>
                  </div>
                  <p className="panel-subtitle">Creates a PENDING request and an atomic CREATED audit event.</p>
                </div>
              </div>
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
            </section>
          )}
        </div>
      </main>
    </>
  );
}
