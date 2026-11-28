import { purchaseStatuses, type PurchaseStatus } from "../modules/procurement/domain/procurement";
import { listLabIdentities, readLabSession } from "../server/auth/lab-session";
import { isLabEnabled } from "../server/db/lab-config";
import { requests } from "../server/procurement/requests";
import { dashboardMetrics } from "./_components/dashboard-metrics";
import { DashboardB } from "./_prototype/dashboard-b.prototype";
import { HomeB } from "./_prototype/home-b.prototype";
import { dashboardExtras } from "./_prototype/load";

export const dynamic = "force-dynamic";

function parseStatusFilter(value: string | string[] | undefined): PurchaseStatus | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return purchaseStatuses.includes(candidate as PurchaseStatus) ? (candidate as PurchaseStatus) : undefined;
}

/** The selected experience is the default in development and production. */
export default async function Workspace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const enabled = isLabEnabled();
  const [params, identities, session] = await Promise.all([
    searchParams,
    enabled ? listLabIdentities() : Promise.resolve([]),
    enabled ? readLabSession() : Promise.resolve(undefined),
  ]);

  if (!session) return <HomeB data={{ identities: [...identities], enabled }} />;

  const [allPurchases, costCenters] = await Promise.all([
    requests.list(session),
    requests.listCostCenters(session),
  ]);
  const activeFilter = parseStatusFilter(params.status);
  const purchases = activeFilter ? allPurchases.filter((purchase) => purchase.status === activeFilter) : allPurchases;
  const metrics = dashboardMetrics(allPurchases, costCenters, session.approvalLimitMinor);
  const extras = await dashboardExtras(session, purchases, costCenters, params.select);

  return <DashboardB data={{ session, identities: [...identities], purchases, costCenters, metrics, activeFilter, asOf: new Date(), ...extras }} />;
}
