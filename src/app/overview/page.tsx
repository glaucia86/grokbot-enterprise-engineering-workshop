import type { Metadata } from "next";
import { listLabIdentities, readLabSession } from "../../server/auth/lab-session";
import { isLabEnabled } from "../../server/db/lab-config";
import { Landing } from "../_components/landing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview — Procurement Hub",
};

export default async function Overview() {
  const enabled = isLabEnabled();
  const [identities, session] = await Promise.all([
    enabled ? listLabIdentities() : Promise.resolve([]),
    enabled ? readLabSession() : Promise.resolve(undefined),
  ]);

  return <Landing enabled={enabled} identities={[...identities]} session={session} />;
}
