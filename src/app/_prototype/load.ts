/* PROTOTYPE server loaders: read-only calls to the existing services only. */
import type { CostCenter, PurchaseRequest } from "../../modules/procurement/domain/procurement";
import { requests } from "../../server/procurement/requests";
import { approverQueue, type DashboardData, type Session } from "./data";

async function selectedRequest(session: Session, id: string): Promise<DashboardData["selected"]> {
  const [detail, audit] = await Promise.all([
    requests.detail(session, id),
    session.role === "REQUESTER" ? Promise.resolve(undefined) : requests.audit(session, id),
  ]);
  return detail ? { detail, events: audit?.kind === "found" ? audit.events : null } : undefined;
}

export async function dashboardExtras(session: Session, purchases: PurchaseRequest[], costCenters: CostCenter[], select: string | string[] | undefined) {
  const recent = session.role === "REQUESTER" ? [] : purchases.toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5);
  const recentTrails = await Promise.all(recent.map(async (request) => {
    const audit = await requests.audit(session, request.id);
    return { request, events: audit.kind === "found" ? audit.events : [] };
  }));

  const wanted = Array.isArray(select) ? select[0] : select;
  const fallback = session.role === "APPROVER"
    ? approverQueue(purchases, costCenters, session.approvalLimitMinor).flatMap((group) => group.items)[0] ?? purchases[0]
    : purchases.find((p) => p.status === "PENDING") ?? purchases[0];
  const selectedId = purchases.some((p) => p.id === wanted) ? wanted : fallback?.id;
  const selected = selectedId ? await selectedRequest(session, selectedId) : undefined;
  return { recentTrails, selected };
}

export async function nextPendingFor(session: Session, currentId: string) {
  if (session.role !== "APPROVER") return null;
  const pending = await requests.list(session, "PENDING");
  return pending.filter((p) => p.id !== currentId).toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null;
}
