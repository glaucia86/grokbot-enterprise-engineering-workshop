import type { Metadata } from "next";
import Workspace from "../page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspace — Procurement Hub" };

/** The canonical workspace shares the same authenticated flow as the root. */
export default function Dashboard({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Workspace searchParams={searchParams} />;
}
