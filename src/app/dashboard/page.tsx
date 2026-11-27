import type { Metadata } from "next";
import Workspace from "../page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspace — Procurement Hub" };

/** Keep the legacy root and its functional browser-test contracts intact. */
export default function Dashboard({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Workspace searchParams={searchParams.then((params) => ({ ...params, variant: params.variant ?? "B" }))} />;
}
