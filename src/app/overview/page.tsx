import type { Metadata } from "next";
import { listLabIdentities, readLabSession } from "../../server/auth/lab-session";
import { isLabEnabled } from "../../server/db/lab-config";
import { Landing } from "../_components/landing";
import { parseVariant, prototypesEnabled } from "../_prototype/flag";
import { HomeA } from "../_prototype/home-a.prototype";
import { HomeB } from "../_prototype/home-b.prototype";
import { HomeC } from "../_prototype/home-c.prototype";
import { PrototypeSwitcher } from "../_prototype/switcher";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview — Procurement Hub",
};

export default async function Overview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const enabled = isLabEnabled();
  const [identities, session, params] = await Promise.all([
    enabled ? listLabIdentities() : Promise.resolve([]),
    enabled ? readLabSession() : Promise.resolve(undefined),
    searchParams,
  ]);
  const prototypes = prototypesEnabled();
  const variant = prototypes ? parseVariant(params.variant) : "0";
  const home = { variant, identities: [...identities], session, enabled };

  return (
    <>
      {variant === "A" ? <HomeA data={home} /> : variant === "B" ? <HomeB data={home} /> : variant === "C" ? <HomeC data={home} /> : <Landing enabled={enabled} identities={[...identities]} session={session} />}
      {prototypes && <PrototypeSwitcher current={variant} />}
    </>
  );
}
