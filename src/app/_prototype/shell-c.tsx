/* PROTOTYPE Variant C shell: editorial masthead with section tabs; no sidebar. */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../_components/ui";
import { longDate, roleLabel, type Identity, type Session } from "./data";
import { editorialSerif, publicSans } from "./fonts";
import { LabSelect } from "./lab-switch";

export function ShellC({ session, identities, asOf, sections, children }: {
  session: Session;
  identities: Identity[];
  asOf: Date;
  sections: { href: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <div className={cn("pc min-h-dvh", editorialSerif.variable, publicSans.variable)}>
      <header className="border-b border-(--p-ink)">
        <div className="mx-auto flex max-w-[76rem] flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-3 sm:px-8">
          <Link href="/?variant=C" className="p-serif-c text-[2.25rem] leading-none text-(--p-ink)">Procurement Hub</Link>
          <p className="text-sm text-(--p-ink-2)">
            <span translate="no">{session.tenantName}</span> · {longDate(asOf)}
          </p>
        </div>
        <div className="mx-auto flex max-w-[76rem] flex-wrap items-center justify-between gap-3 border-t border-(--p-line) px-5 py-2 sm:px-8">
          <nav aria-label="Sections" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {sections.map((section) => (
              <a key={section.href} href={section.href} className="py-1 text-(--p-ink-2) underline-offset-4 hover:text-(--p-ink) hover:underline">{section.label}</a>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2 text-xs text-(--p-ink-3)">
            <span>{session.displayName} · {roleLabel[session.role]} · synthetic lab identity</span>
            <LabSelect
              identities={identities}
              current={session.key}
              className="flex items-center gap-1.5"
              selectClassName="min-h-8 max-w-[13rem] rounded-sm border border-(--p-line-strong) bg-(--p-surface) px-2 text-xs"
              buttonClassName="min-h-8 rounded-sm border border-(--p-ink) px-2.5 text-xs font-medium hover:bg-(--p-ink) hover:text-(--p-canvas)"
            />
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-[76rem] px-5 py-8 sm:px-8 lg:py-12">{children}</main>
    </div>
  );
}

export function RuleChart({ allocatedMinor, committedMinor, pendingMinor = 0 }: { allocatedMinor: number; committedMinor: number; pendingMinor?: number }) {
  const pct = (value: number) => Math.min(100, Math.max(0, allocatedMinor > 0 ? (value / allocatedMinor) * 100 : 0));
  const committed = pct(committedMinor);
  const pending = pct(committedMinor + pendingMinor) - committed;
  const over = committedMinor > allocatedMinor;
  return (
    <div className="relative h-2 border-y border-(--p-ink)/20" aria-hidden="true">
      <div className={cn("absolute inset-y-0 left-0", over ? "bg-(--p-violation)" : "bg-(--p-forest)")} style={{ width: `${committed}%` }} />
      {pending > 0 && <div className="p-hatch absolute inset-y-0 text-(--p-gold-ink)" style={{ left: `${committed}%`, width: `${pending}%` }} />}
    </div>
  );
}
