import Link from "next/link";
import { listLabIdentities, readLabSession } from "../server/auth/lab-session";
import { isLabEnabled } from "../server/db/lab-config";
import { requests } from "../server/procurement/requests";
import { formatUsd } from "./format-purchase";
import { LabIdentityForm } from "./lab-identity-form";
import { PurchaseRequestForm } from "./purchase-request-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const enabled = isLabEnabled();
  const [identities, session] = enabled
    ? await Promise.all([listLabIdentities(), readLabSession()])
    : [[], undefined] as const;
  const purchases = session ? await requests.list(session) : [];

  return (
    <main>
      <header className="page-header">
        <h1>Procurement Hub</h1>
        <a href="/api/health">Check lab readiness</a>
      </header>

      <section className="panel" aria-labelledby="session-heading">
        <h2 id="session-heading">Workshop session</h2>
        {session && (
          <p className="session-state">
            <strong>{session.tenantName}</strong> · {session.displayName} · {session.role}
          </p>
        )}
        {enabled
          ? <LabIdentityForm identities={[...identities]} selected={session?.key ?? undefined} />
          : <p>Enable the local lab profile and initialize the synthetic identities to continue.</p>}
      </section>

      {session && (
        <div className="workspace">
          <section className="panel" aria-labelledby="requests-heading">
            <h2 id="requests-heading">{session.role === "REQUESTER" ? "My requests" : "Tenant requests"}</h2>
            {purchases.length === 0 ? <p>No purchase requests yet.</p> : (
              <table>
                <thead>
                  <tr><th scope="col">Request</th><th scope="col">Amount</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td><Link href={"/requests/" + purchase.id} prefetch={false}>{purchase.title}</Link></td>
                      <td className="amount">{formatUsd(purchase.amountMinor)}</td>
                      <td><span className="status">{purchase.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {session.role === "REQUESTER" && (
            <section className="panel" aria-labelledby="create-heading">
              <h2 id="create-heading">New purchase request</h2>
              <PurchaseRequestForm />
            </section>
          )}
        </div>
      )}
    </main>
  );
}
