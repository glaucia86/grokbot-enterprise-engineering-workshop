import type { Metadata } from "next";
import Overview from "../overview/page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Procurement Hub — Financial operations" };

/** Prototype entry: choose B unless the reviewer explicitly requests another variant. */
export default function ProductHome({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Overview searchParams={searchParams.then((params) => ({ ...params, variant: params.variant ?? "B" }))} />;
}
