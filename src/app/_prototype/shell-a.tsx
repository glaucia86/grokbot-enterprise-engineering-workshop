/* PROTOTYPE Variant A shell: persistent navy rail, statement-style header, synthetic-lab identity at the foot. */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../_components/ui";
import { formatUsd } from "../format-purchase";
import { asOfLabel, roleLabel, type Identity, type Session } from "./data";
import { sourceSerif } from "./fonts";
import { LabSelect } from "./lab-switch";

export function ShellA({ session, identities, asOf, nav, title, subtitle, children }: {
  session: Session;
  identities: Identity[];
  asOf: Date;
  nav: { href: string; label: string; count?: number; current?: boolean }[];
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("pa min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]", sourceSerif.variable)}>
      <aside className="flex flex-col bg-(--p-navy) text-(--p-navy-ink) lg:sticky lg:top-0 lg:h-dvh">
        <Link href="/?variant=A" className="block px-6 pt-6 pb-5">
          <span className="p-serif-a block text-[1.375rem] leading-none font-semibold tracking-[-0.01em] text-white">Procurement Hub</span>
          <span className="mt-1.5 block text-xs text-(--p-navy-muted)" translate="no">{session.tenantName}</span>
        </Link>
        <nav aria-label="Workspace" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:grid lg:gap-0.5 lg:overflow-visible">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "flex min-h-9 items-center justify-between gap-3 rounded-md px-3 text-sm whitespace-nowrap",
                item.current ? "bg-(--p-navy-2) font-medium text-white" : "text-(--p-navy-muted) hover:bg-(--p-navy-2) hover:text-white",
              )}
            >
              {item.label}
              {item.count !== undefined && <span className="p-figures text-xs text-(--p-navy-muted)">{item.count}</span>}
            </a>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 p-4 lg:block">
          <p className="text-[0.6875rem] font-medium text-(--p-navy-muted)">Synthetic lab identity</p>
          <LabSelect
            identities={identities}
            current={session.key}
            className="mt-2 grid gap-2"
            selectClassName="min-h-9 w-full rounded-md border border-white/15 bg-(--p-navy-2) px-2 text-[0.8125rem] text-white"
            buttonClassName="min-h-8 rounded-md border border-white/15 text-xs font-medium text-(--p-navy-ink) hover:bg-white/10"
          />
          <p className="mt-2 text-[0.6875rem] leading-snug text-(--p-navy-muted)">Simulation for the workshop. Not a sign-in.</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-(--p-line) bg-(--p-surface) px-5 py-5 sm:px-8 lg:px-10">
          <div className="min-w-0">
            <h1 className="p-serif-a text-[1.75rem] leading-tight font-semibold tracking-[-0.015em]">{title}</h1>
            <p className="mt-1 text-sm text-(--p-ink-3)">{subtitle ?? <>Figures as of {asOfLabel(asOf)}</>}</p>
          </div>
          <p className="text-right text-sm leading-snug">
            <span className="block font-medium">{session.displayName}</span>
            <span className="block text-(--p-ink-3)">
              {roleLabel[session.role]}
              {session.approvalLimitMinor !== null && <> · limit <span className="p-figures">{formatUsd(session.approvalLimitMinor)}</span></>}
            </span>
          </p>
        </header>
        <main id="main-content" className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function BulletA({ allocatedMinor, committedMinor, pendingMinor = 0 }: { allocatedMinor: number; committedMinor: number; pendingMinor?: number }) {
  const pct = (value: number) => Math.min(100, Math.max(0, allocatedMinor > 0 ? (value / allocatedMinor) * 100 : value > 0 ? 100 : 0));
  const committed = pct(committedMinor);
  const pending = pct(committedMinor + pendingMinor) - committed;
  const over = committedMinor > allocatedMinor;
  return (
    <div className="relative h-3 w-full rounded-sm bg-(--p-track)" aria-hidden="true">
      <div className={cn("absolute inset-y-0 left-0 rounded-sm", over ? "bg-(--p-violation)" : "bg-(--p-navy)")} style={{ width: `${committed}%` }} />
      {pending > 0 && <div className="p-hatch absolute inset-y-0 text-(--p-accent)" style={{ left: `${committed}%`, width: `${pending}%` }} />}
      <span className="absolute -inset-y-1 left-[80%] w-px bg-(--p-ink-3)" />
    </div>
  );
}
