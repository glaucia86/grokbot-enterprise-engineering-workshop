import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import type { PurchaseStatus } from "../../../modules/procurement/domain/procurement";
import { readLabSession } from "../../../server/auth/lab-session";
import { requests } from "../../../server/procurement/requests";
import { AppTopbar } from "../../_components/app-topbar";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  FileCheckIcon,
  LockIcon,
  ShieldCheckIcon,
  WalletIcon,
  XCircleIcon,
} from "../../_components/icons";
import { stagger } from "../../_components/motion";
import { UtilizationRing, utilizationTone } from "../../_components/utilization-ring";
import { computeUtilizationPercent, formatUsd, formatUtcTimestamp } from "../../format-purchase";
import { DecisionForm } from "./decision-form";

type StepState = "done" | "current" | "upcoming" | "approved" | "rejected";

function workflowSteps(status: PurchaseStatus): { label: string; hint: string; state: StepState }[] {
  const decided = status !== "PENDING";
  return [
    { label: "Submitted", hint: "Request recorded", state: "done" },
    { label: "Decision", hint: decided ? "Decision recorded" : "Awaiting approver", state: decided ? "done" : "current" },
    {
      label: status === "REJECTED" ? "Rejected" : status === "APPROVED" ? "Approved" : "Outcome",
      hint: status === "APPROVED" ? "Budget committed" : status === "REJECTED" ? "No budget impact" : "Terminal state",
      state: status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "upcoming",
    },
  ];
}

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

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
  const tone = utilizationTone(utilPct, overspent);
  const projectedTone = utilizationTone(projectedPct, projectedRemaining < 0);
  const pending = purchase.status === "PENDING";

  return (
    <>
      <AppTopbar session={session} section="detail" />

      <main id="main-content" className="app-main">
        <Link className="back-link" href="/" prefetch={false}>
          <ArrowLeftIcon size={16} />
          Back to purchase requests
        </Link>

        <div className="detail-grid">
          <div className="stack">
            <article className="panel detail-hero reveal">
              <header className="detail-header">
                <div className="detail-title-group">
                  <p className="eyebrow"><FileCheckIcon size={14} />Purchase request</p>
                  <h1>{purchase.title}</h1>
                  <p className="panel-subtitle mono" translate="no">Request ID · {purchase.id}</p>
                </div>
                <span className={"status status-lg status-" + purchase.status.toLowerCase()} role="status">
                  {purchase.status}
                </span>
              </header>

              <ol className="stepper" aria-label="Workflow progress">
                {workflowSteps(purchase.status).map((step, index) => (
                  <li key={step.label} className={"step step-" + step.state} style={stagger(index)}>
                    <span className="step-marker" aria-hidden="true">
                      {step.state === "rejected" ? <XCircleIcon size={15} /> : step.state === "upcoming" || step.state === "current" ? <ClockIcon size={14} /> : <CheckCircleIcon size={15} />}
                    </span>
                    <span className="step-copy">
                      <span className="step-label">{step.label}</span>
                      <span className="step-hint">{step.hint}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <dl className="request-details">
                <div className="detail-amount">
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
                  <dd className="justification">{purchase.justification}</dd>
                </div>
              </dl>
            </article>

            {audit?.kind === "found" && (
              <section className="panel reveal" style={stagger(2)} aria-labelledby="audit-heading">
                <div className="panel-header">
                  <div className="panel-heading-group">
                    <span className="panel-icon"><ClockIcon size={17} /></span>
                    <h2 id="audit-heading">Audit trail</h2>
                  </div>
                  <span className="live-badge">{audit.events.length} durable events</span>
                </div>
                <ol className="audit-list">
                  {audit.events.map((event, index) => {
                    const variant = event.type === "APPROVED" ? "approved" : event.type === "REJECTED" ? "rejected" : "created";
                    return (
                      <li key={event.id} className={"audit-item audit-item-" + variant} style={stagger(index)}>
                        <span className="audit-marker" aria-hidden="true">
                          {variant === "approved" ? <CheckCircleIcon size={14} /> : variant === "rejected" ? <XCircleIcon size={14} /> : <FileCheckIcon size={14} />}
                        </span>
                        <div className="audit-body">
                          <div className="audit-meta">
                            <strong>{event.type}</strong>
                            <span>· {event.actorName}</span>
                            <time className="audit-time" dateTime={event.occurredAt.toISOString()}>
                              {formatUtcTimestamp(event.occurredAt)}
                            </time>
                          </div>
                          {event.reason && <p className="audit-reason">{event.reason}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
          </div>

          <aside className="stack" aria-label="Budget and approval controls">
            <section className="panel reveal" style={stagger(1)} aria-labelledby="budget-context-heading">
              <div className="panel-header">
                <div className="panel-heading-group">
                  <span className="panel-icon"><WalletIcon size={17} /></span>
                  <h2 id="budget-context-heading">Cost center ledger</h2>
                </div>
                <span className="code-chip" translate="no">{costCenter.code}</span>
              </div>

              <div className="ledger-summary">
                <UtilizationRing percent={utilPct} tone={tone} size={88} label={`${utilPct}%`} />
                <div className="ledger-summary-copy">
                  <p className="ledger-summary-name">{costCenter.name}</p>
                  <p className="ledger-summary-sub">
                    <span className="mono">{utilPct}% used</span>
                    {pending && <> · <span className="mono">{projectedPct}%</span> if approved</>}
                  </p>
                </div>
              </div>

              <div className="meter-track meter-track-lg" aria-hidden="true">
                <div className={"meter-fill meter-fill-" + tone} style={{ width: `${clampPct(utilPct)}%` }} />
                {pending && projectedPct > utilPct && (
                  <div
                    className={"meter-projected meter-projected-" + projectedTone}
                    style={{ left: `${clampPct(utilPct)}%`, width: `${clampPct(projectedPct) - clampPct(utilPct)}%` }}
                  />
                )}
                <span className="meter-threshold" />
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
                <div className="impact-row impact-row-strong">
                  <span>Available budget</span>
                  <strong className={overspent ? "amount budget-overspent" : "amount"}>
                    {formatUsd(costCenter.availableBudgetMinor)}
                  </strong>
                </div>
                {pending && (
                  <div className="impact-row impact-row-projected">
                    <span>Projected if approved ({projectedPct}%)</span>
                    <strong className={projectedRemaining < 0 ? "amount budget-overspent" : "amount"}>
                      {formatUsd(projectedRemaining)}
                    </strong>
                  </div>
                )}
              </div>
            </section>

            {commitment && (
              <section className="panel commitment-panel reveal" style={stagger(2)} aria-labelledby="commitment-heading">
                <div className="panel-header">
                  <div className="panel-heading-group">
                    <span className="panel-icon panel-icon-success"><ShieldCheckIcon size={17} /></span>
                    <h2 id="commitment-heading">Financial commitment</h2>
                  </div>
                  <span className="receipt-stamp">Committed</span>
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
              <section className="panel panel-decision reveal" style={stagger(2)} aria-labelledby="decision-heading">
                <div className="panel-header">
                  <div className="panel-heading-group">
                    <span className="panel-icon"><LockIcon size={17} /></span>
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
