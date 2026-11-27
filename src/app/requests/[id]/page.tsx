import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { listLabIdentities, readLabSession } from "../../../server/auth/lab-session";
import { requests } from "../../../server/procurement/requests";
import { nextPendingFor } from "../../_prototype/load";
import { ReviewB } from "../../_prototype/review-b.prototype";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await readLabSession();
  if (!session) redirect("/home");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [detail, audit, identities] = await Promise.all([
    requests.detail(session, id.data),
    session.role === "REQUESTER" ? Promise.resolve(undefined) : requests.audit(session, id.data),
    listLabIdentities(),
  ]);
  if (!detail) notFound();

  const nextPending = await nextPendingFor(session, detail.purchase.id);
  return <ReviewB data={{ session, identities: [...identities], detail, events: audit?.kind === "found" ? audit.events : null, nextPending, asOf: new Date() }} />;
}
