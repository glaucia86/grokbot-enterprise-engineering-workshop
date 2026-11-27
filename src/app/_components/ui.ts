import type { PurchaseStatus } from "../../modules/procurement/domain/procurement";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* Shape lock: cards rounded-xl (12px), controls rounded-lg (8px), chips rounded-md (6px), badges rounded-full. */
export const card = "spotlight min-w-0 rounded-xl border border-line bg-surface shadow-card";
export const cardHeader = "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-3.5";
export const cardTitle = "text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink";
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.08em] text-ink-3";

const buttonBase =
  "inline-flex min-h-10 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 disabled:active:scale-100";

export const button = {
  primary: cn(buttonBase, "bg-accent-solid text-white shadow-card hover:bg-accent-solid-hover"),
  secondary: cn(buttonBase, "border border-line-strong bg-surface text-ink hover:border-ink-3 hover:bg-subtle"),
  quiet: cn(buttonBase, "text-accent hover:bg-accent-soft"),
  danger: cn(buttonBase, "bg-danger-solid text-white shadow-card hover:brightness-110"),
};

export const field = "grid min-w-0 gap-1.5";
export const label = "text-[0.8125rem] font-medium text-ink-2";
export const control =
  "min-h-10 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink shadow-[inset_0_1px_1px_rgb(28_25_23/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3/80 hover:border-ink-3 focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--accent-line)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const labelNight = "text-[0.8125rem] font-medium text-night-muted";
export const controlNight =
  "min-h-11 w-full rounded-lg border border-night-line bg-night-raised px-3 py-2 text-sm text-night-ink transition-[border-color,box-shadow] duration-150 hover:border-white/20 focus-visible:border-night-accent focus-visible:shadow-[0_0_0_3px_rgb(251_146_60/0.3)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 [&>option]:bg-night-surface [&>option]:text-night-ink";

export const chip = "inline-flex items-center rounded-md border border-line bg-muted px-1.5 py-0.5 font-mono text-xs text-ink-2 whitespace-nowrap";

export const statusTone: Record<PurchaseStatus, string> = {
  PENDING: "border-warning-line bg-warning-soft text-warning",
  APPROVED: "border-success-line bg-success-soft text-success",
  REJECTED: "border-danger-line bg-danger-soft text-danger",
};

export const statusBadge = "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.04em] whitespace-nowrap";
