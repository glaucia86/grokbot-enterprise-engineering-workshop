import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { readLabSession } from "../../../server/auth/lab-session";
import { requests } from "../../../server/procurement/requests";
import { formatUsd } from "../../format-purchase";
import { DecisionForm } from "./decision-form";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await readLabSession();
  if (!session) redirect("/");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const detail = await requests.detail(session, id.data);
  if (!detail) notFound();
  const { purchase, costCenter, commitment, canDecide, canApprove } = detail;

  const audit = session.role === "REQUESTER" ? undefined : await requests.audit(session, id.data);
  return (
    <main>
      <Link className="back-link" href="/" prefetch={false}>Back to purchase requests</Link>
      <article className="panel">
        <header className="detail-header">
          <h1>{purchase.title}</h1>
          <span className={"status status-" + purchase.status.toLowerCase()} role="status">{purchase.status}</span>
        </header>
        <dl className="request-details">
          <div><dt>Tenant</dt><dd>{session.tenantName}</dd></div>
          <div>
            <dt>Cost center</dt>
            <dd>
              <code>{costCenter.code}</code> — {costCenter.name} · Allocated {formatUsd(costCenter.allocatedBudgetMinor)} ·
              Committed {formatUsd(costCenter.committedBudgetMinor)} · Available{" "}
              <strong className={costCenter.availableBudgetMinor < 0 ? "budget-overspent" : undefined}>
                {formatUsd(costCenter.availableBudgetMinor)}
              </strong>
            </dd>
          </div>
          <div><dt>Amount</dt><dd className="amount">{formatUsd(purchase.amountMinor)}</dd></div>
          <div><dt>Justification</dt><dd>{purchase.justification}</dd></div>
        </dl>
      </article>

      {commitment && (
        <section className="panel" aria-labelledby="commitment-heading">
          <h2 id="commitment-heading">Financial commitment</h2>
          <dl className="request-details">
            <div><dt>Commitment ID</dt><dd><code>{commitment.id}</code></dd></div>
            <div><dt>Committed amount</dt><dd className="amount">{formatUsd(commitment.amountMinor)}</dd></div>
            <div><dt>Committed by</dt><dd>{commitment.committedByActorName}</dd></div>
          </dl>
        </section>
      )}

      {canDecide && (
        <section className="panel" aria-labelledby="decision-heading">
          <h2 id="decision-heading">Record decision</h2>
          {!canApprove && session.approvalLimitMinor !== null && (
            <p className="session-state">
              This request ({formatUsd(purchase.amountMinor)}) exceeds your approval limit ({formatUsd(session.approvalLimitMinor)}). You may reject it, or escalate approval to a higher-authority approver.
            </p>
          )}
          <DecisionForm requestId={purchase.id} />
        </section>
      )}

      {audit?.kind === "found" && (
        <section className="panel" aria-labelledby="audit-heading">
          <h2 id="audit-heading">Audit trail</h2>
          <ol className="audit-list">
            {audit.events.map((event) => (
              <li key={event.id}>
                <strong>{event.type}</strong> · {event.actorName} ·{" "}
                <time dateTime={event.occurredAt.toISOString()}>
                  {event.occurredAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </time>
                {event.reason && <p className="audit-reason">{event.reason}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
