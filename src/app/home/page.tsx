import type { Metadata } from "next";
import { listLabIdentities, readLabSession } from "../../server/auth/lab-session";
import { isLabEnabled } from "../../server/db/lab-config";
import { HomeB } from "../_prototype/home-b.prototype";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Procurement Hub — Financial operations" };

export default async function ProductHome() {
  const enabled = isLabEnabled();
  const [identities, session] = await Promise.all([
    enabled ? listLabIdentities() : Promise.resolve([]),
    enabled ? readLabSession() : Promise.resolve(undefined),
  ]);

  return <HomeB data={{ identities: [...identities], session, enabled }} />;
}
