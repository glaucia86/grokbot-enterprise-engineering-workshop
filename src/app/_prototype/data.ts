/* Presentation data for the selected procurement experience. */
import type { AuditEvent, CostCenter, PurchaseRequest, PurchaseStatus } from "../../modules/procurement/domain/procurement";
import type { listLabIdentities, readLabSession } from "../../server/auth/lab-session";
import type { requests } from "../../server/procurement/requests";
import type { DashboardMetrics } from "../_components/dashboard-metrics";

export type Session = NonNullable<Awaited<ReturnType<typeof readLabSession>>>;
export type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];
export type Detail = NonNullable<Awaited<ReturnType<typeof requests.detail>>>;

export type DashboardData = {
  session: Session;
  identities: Identity[];
  purchases: PurchaseRequest[];
  costCenters: CostCenter[];
  metrics: DashboardMetrics;
  activeFilter?: PurchaseStatus;
  selected?: { detail: Detail; events: AuditEvent[] | null };
  asOf: Date;
};

export type ReviewData = {
  session: Session;
  identities: Identity[];
  detail: Detail;
  events: AuditEvent[] | null;
  nextPending: PurchaseRequest | null;
  asOf: Date;
};

export type HomeData = { identities: Identity[]; session?: Session; enabled: boolean };

export const statusLabel: Record<PurchaseStatus, string> = {
  PENDING: "Pending decision",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const roleLabel: Record<string, string> = { REQUESTER: "Requester", APPROVER: "Approver", AUDITOR: "Auditor" };

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Presentation-only reference from the UUID suffix; extends when two visible requests collide. */
export function references(ids: string[]) {
  const map = new Map<string, string>();
  for (const length of [6, 8, 12]) {
    const suffix = (id: string) => id.replaceAll("-", "").slice(-length).toUpperCase();
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(suffix(id), (counts.get(suffix(id)) ?? 0) + 1);
    for (const id of ids) if (!map.has(id) && (counts.get(suffix(id)) === 1 || length === 12)) map.set(id, "PR-" + suffix(id));
  }
  return (id: string) => map.get(id) ?? "PR-" + id.replaceAll("-", "").slice(-6).toUpperCase();
}

export type QueueGroup = { key: "ready" | "over-budget" | "over-limit"; title: string; note: string; items: PurchaseRequest[] };

/** Preliminary grouping from data already on screen; the server rechecks authority and budget on decision. */
export function approverQueue(purchases: PurchaseRequest[], costCenters: CostCenter[], limitMinor: number | null): QueueGroup[] {
  const available = new Map(costCenters.map((center) => [center.id, center.availableBudgetMinor]));
  const pending = purchases.filter((purchase) => purchase.status === "PENDING").toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const withinLimit = (purchase: PurchaseRequest) => limitMinor !== null && purchase.amountMinor <= limitMinor;
  const fits = (purchase: PurchaseRequest) => purchase.amountMinor <= (available.get(purchase.costCenterId) ?? 0);
  return [
    { key: "ready", title: "Ready for your decision", note: "Within your limit and the cost center's current available budget.", items: pending.filter((p) => withinLimit(p) && fits(p)) },
    { key: "over-budget", title: "May exceed available budget", note: "Within your limit, but larger than what the cost center has available right now.", items: pending.filter((p) => withinLimit(p) && !fits(p)) },
    { key: "over-limit", title: "Needs higher authority", note: "Above your approval limit. You can reject, or leave it for an approver with a higher limit.", items: pending.filter((p) => !withinLimit(p)) },
  ];
}

export function waitingDays(createdAt: Date, asOf: Date) {
  const days = Math.floor((asOf.getTime() - createdAt.getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

export function percent(part: number, whole: number) {
  if (whole <= 0) return part > 0 ? 100 : 0;
  return Math.round((part / whole) * 100);
}

export const asOfLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(date) + " UTC";

export const longDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
