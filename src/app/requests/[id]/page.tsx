import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { readLabSession } from "../../../server/auth/lab-session";
import { requests } from "../../../server/procurement/requests";
import { formatUsd } from "../../format-purchase";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await readLabSession();
  if (!session) redirect("/");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const purchase = await requests.find(session, id.data);
  if (!purchase) notFound();

  const audit = session.role === "REQUESTER" ? undefined : await requests.audit(session, id.data);
  return (
    <main>
      <Link className="back-link" href="/" prefetch={false}>Back to purchase requests</Link>
      <article className="panel">
        <header className="detail-header">
          <h1>{purchase.title}</h1>
          <span className="status">{purchase.status}</span>
        </header>
        <dl className="request-details">
          <div><dt>Tenant</dt><dd>{session.tenantName}</dd></div>
          <div><dt>Amount</dt><dd className="amount">{formatUsd(purchase.amountMinor)}</dd></div>
          <div><dt>Justification</dt><dd>{purchase.justification}</dd></div>
        </dl>
      </article>

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
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
