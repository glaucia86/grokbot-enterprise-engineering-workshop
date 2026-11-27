/*
 * PROTOTYPE (throwaway, branch prototype/ux-variants only — never merge).
 * Question: what should the workspace, inbox, review and home look like?
 * Three structurally different variants on the existing routes, selected with ?variant=A|B|C
 * ("0" = the current UI). Read-only: decision buttons are stubs and never call the decision API.
 */
import { isLabEnabled } from "../../server/db/lab-config";

export const variants = [
  { key: "0", name: "Current UI" },
  { key: "A", name: "Institutional Command Center" },
  { key: "B", name: "Approval-First Workspace" },
  { key: "C", name: "Editorial Financial Intelligence" },
] as const;

export type VariantKey = (typeof variants)[number]["key"];

/** Lab mode plus dev, or an explicit WORKSHOP_PROTOTYPES=enabled for `next start`. */
export function prototypesEnabled() {
  return isLabEnabled() && (process.env.NODE_ENV !== "production" || process.env.WORKSHOP_PROTOTYPES === "enabled");
}

export function parseVariant(value: string | string[] | undefined): VariantKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return variants.find((variant) => variant.key === candidate)?.key ?? "0";
}
