/* PROTOTYPE Variant B shell: slim labelled rail, work-first top bar, lab identity tucked into the bar. */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../_components/ui";
import { roleLabel, type Identity, type Session } from "./data";
import { LabSelect } from "./lab-switch";

export function ShellB({ session, identities, nav, children }: {
  session: Session;
  identities: Identity[];
  nav: { href: string; label: string; icon: ReactNode; current?: boolean; count?: number }[];
  children: ReactNode;
}) {
  return (
    <div className="pb min-h-dvh md:grid md:grid-cols-[4.5rem_minmax(0,1fr)]">
      <nav aria-label="Workspace" className="flex items-center gap-1 border-b border-(--p-line) bg-(--p-surface) px-2 py-1.5 md:sticky md:top-0 md:h-dvh md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-1.5 md:py-3">
        <Link href="/?variant=B" className="mb-0 grid h-10 place-items-center rounded-md bg-(--p-navy) text-sm font-bold text-white md:mb-3" aria-label="Procurement Hub home">PH</Link>
        {nav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            className={cn(
              "relative grid min-h-12 min-w-14 place-items-center rounded-md px-1 text-[0.6875rem] font-medium",
              item.current ? "bg-(--p-accent-soft) text-(--p-accent)" : "text-(--p-ink-3) hover:bg-(--p-track) hover:text-(--p-ink)",
            )}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span className="p-figures absolute top-1 right-1 rounded-full bg-(--p-accent) px-1.5 text-[0.625rem] leading-4 text-white">{item.count}</span>
            )}
          </a>
        ))}
      </nav>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--p-line) bg-(--p-surface) px-4 py-2 text-xs text-(--p-ink-3) sm:px-6">
          <span><span className="font-medium text-(--p-ink-2)" translate="no">{session.tenantName}</span> · {session.displayName} · {roleLabel[session.role]}</span>
          <LabSelect
            identities={identities}
            current={session.key}
            className="flex items-center gap-1.5"
            selectClassName="min-h-8 max-w-[14rem] rounded-md border border-(--p-line-strong) bg-(--p-surface) px-2 text-xs text-(--p-ink-2)"
            buttonClassName="min-h-8 rounded-md border border-(--p-line-strong) px-2.5 text-xs font-medium text-(--p-ink-2) hover:bg-(--p-track)"
          />
        </div>
        <main id="main-content">{children}</main>
      </div>
    </div>
  );
}
