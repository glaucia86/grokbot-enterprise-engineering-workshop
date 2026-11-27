import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { readLabSession } from "../../../server/auth/lab-session";
import { requests } from "../../../server/procurement/requests";
import {
  ActivityIcon,
  ArrowLeftIcon,
  ClockIcon,
  FileCheckIcon,
  LockIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "../../_components/icons";
import { computeUtilizationPercent, formatUsd, formatUtcTimestamp } from "../../format-purchase";
import { DecisionForm } from "./decision-form";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await readLabSession();
  if (!session) redirect("/");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [detail, audit] = await Promise.all([
    requests.detail(session, id.data),
    session.role === "REQUESTER" ? Promise.resolve(undefined) : requests.audit(session, id.data),
  ]);
  if (!detail) notFound();

  const { purchase, costCenter, commitment, canDecide, canApprove } = detail;
  const utilPct = computeUtilizationPercent(costCenter.allocatedBudgetMinor, costCenter.committedBudgetMinor);
  const overspent = costCenter.availableBudgetMinor < 0;
  const projectedRemaining = costCenter.availableBudgetMinor - purchase.amountMinor;
  const projectedPct = computeUtilizationPercent(
    costCenter.allocatedBudgetMinor,
    costCenter.committedBudgetMinor + purchase.amountMinor,
  );
  const meterClass = overspent
    ? "meter-fill meter-fill-danger"
    : utilPct >= 80
      ? "meter-fill meter-fill-warning"
      : "meter-fill";

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="brand-group">
            <span className="brand-mark"><ShieldCheckIcon size={20} /></span>
            <div className="brand-text">
              <Link href="/" prefetch={false} className="brand-title">Procurement Hub</Link>
              <span className="env-badge" translate="no">{session.tenantName}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="session-state">
              {session.displayName} · {session.role}
            </span>
            <a className="health-link" href="/api/health">
              <span className="health-dot" aria-hidden="true" />
              <ActivityIcon size={15} />
              Lab health
            </a>
          </div>
        </div>
      </header>

      <main id="main-content">
        <Link className="back-link" href="/" prefetch={false}>
          <ArrowLeftIcon size={16} />
          Back to purchase requests
        </Link>

        <div className="detail-grid">
          <div className="stack">
            <article className="panel">
              <header className="detail-header">
                <div>
                  <h1>{purchase.title}</h1>
                  <p className="panel-subtitle mono" translate="no">Request ID · {purchase.id}</p>
                </div>
                <span className={"status status-" + purchase.status.toLowerCase()} role="status">
                  {purchase.status}
                </span>
              </header>

              <dl className="request-details">
                <div>
                  <dt>Amount</dt>
                  <dd className="amount detail-amount-hero">{formatUsd(purchase.amountMinor)}</dd>
                </div>
                <div>
                  <dt>Tenant</dt>
                  <dd>{session.tenantName}</dd>
                </div>
                <div>
                  <dt>Cost center</dt>
                  <dd>
                    <span className="code-chip" translate="no">{costCenter.code}</span>{" "}
                    {costCenter.name}
                  </dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd className="mono">
                    <time dateTime={purchase.createdAt.toISOString()}>
                      {formatUtcTimestamp(purchase.createdAt)}
                    </time>
                  </dd>
                </div>
                <div className="detail-full">
                  <dt>Justification</dt>
                  <dd>{purchase.justification}</dd>
                </div>
              </dl>
            </article>

            {audit?.kind === "found" && (
              <section className="panel" aria-labelledby="audit-heading">
                <div className="panel-header">
                  <div className="panel-heading-group">
                    <ClockIcon size={18} className="panel-icon" />
                    <h2 id="audit-heading">Audit trail</h2>
                  </div>
                  <span className="panel-subtitle">{audit.events.length} durable events</span>
                </div>
                <ol className="audit-list">
                  {audit.events.map((event) => {
                    const variant =
                      event.type === "APPROVED"
                        ? "audit-item audit-item-approved"
                        : event.type === "REJECTED"
                          ? "audit-item audit-item-rejected"
                          : "audit-item";
                    return (
                      <li key={event.id} className={variant}>
                        <div className="audit-meta">
                          <strong>{event.type}</strong>
                          <span>· {event.actorName}</span>
                          <time className="audit-time" dateTime={event.occurredAt.toISOString()}>
                            {formatUtcTimestamp(event.occurredAt)}
                          </time>
                        </div>
                        {event.reason && <p className="audit-reason">{event.reason}</p>}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </div>

          <aside className="stack" aria-label="Budget and approval controls">
            <section className="panel" aria-labelledby="budget-context-heading">
              <div className="panel-header">
                <div className="panel-heading-group">
                  <WalletIcon size={18} className="panel-icon" />
                  <h2 id="budget-context-heading">Cost center ledger</h2>
                </div>
                <span className="code-chip" translate="no">{costCenter.code}</span>
              </div>

              <div className="meter-header">
                <span>{costCenter.name}</span>
                <span className="mono">{utilPct}% used</span>
              </div>
              <div className="meter-track" aria-hidden="true">
                <div className={meterClass} style={{ width: `${Math.min(100, Math.max(0, utilPct))}%` }} />
              </div>

              <div className="impact-box">
                <div className="impact-row">
                  <span>Allocated budget</span>
                  <span className="amount">{formatUsd(costCenter.allocatedBudgetMinor)}</span>
                </div>
                <div className="impact-row">
                  <span>Committed budget</span>
                  <span className="amount">{formatUsd(costCenter.committedBudgetMinor)}</span>
                </div>
                <div className="impact-row">
                  <span>Available budget</span>
                  <strong className={overspent ? "amount budget-overspent" : "amount"}>
                    {formatUsd(costCenter.availableBudgetMinor)}
                  </strong>
                </div>
                {purchase.status === "PENDING" && (
                  <div className="impact-row">
                    <span>Projected if approved ({projectedPct}%)</span>
                    <strong className={projectedRemaining < 0 ? "amount budget-overspent" : "amount"}>
                      {formatUsd(projectedRemaining)}
                    </strong>
                  </div>
                )}
              </div>
            </section>

            {commitment && (
              <section className="panel commitment-panel" aria-labelledby="commitment-heading">
                <div className="panel-header">
                  <div className="panel-heading-group">
                    <FileCheckIcon size={18} className="panel-icon" />
                    <h2 id="commitment-heading">Financial commitment</h2>
                  </div>
                </div>
                <dl className="request-details">
                  <div className="detail-full">
                    <dt>Commitment ID</dt>
                    <dd className="mono" translate="no">{commitment.id}</dd>
                  </div>
                  <div>
                    <dt>Committed by</dt>
                    <dd>{commitment.committedByActorName}</dd>
                  </div>
                  <div>
                    <dt>Committed at</dt>
                    <dd className="mono">
                      <time dateTime={commitment.committedAt.toISOString()}>
                        {formatUtcTimestamp(commitment.committedAt)}
                      </time>
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {canDecide && (
              <section className="panel" aria-labelledby="decision-heading">
                <div className="panel-header">
                  <div className="panel-heading-group">
                    <LockIcon size={18} className="panel-icon" />
                    <h2 id="decision-heading">Record decision</h2>
                  </div>
                </div>
                {!canApprove && session.approvalLimitMinor !== null && (
                  <p className="policy-notice">
                    This request exceeds your approval limit ({formatUsd(session.approvalLimitMinor)}). You may reject it, or escalate approval to a higher-authority approver.
                  </p>
                )}
                <DecisionForm requestId={purchase.id} />
              </section>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
