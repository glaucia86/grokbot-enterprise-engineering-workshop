import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpenTextIcon,
  BuildingsIcon,
  PulseIcon,
  ShieldCheckIcon,
  SquaresFourIcon,
} from "./icons";
import { initialsOf } from "./initials";
import { cn } from "./ui";

type ShellSession = { displayName: string; role: string; tenantName: string };
type Section = "dashboard" | "overview" | "detail";
export type SectionLink = { href: string; label: string };

export function BrandMark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-solid text-white" aria-hidden="true">
      <ShieldCheckIcon size={18} weight="bold" />
    </span>
  );
}

function NavLink({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150",
        current ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function HealthLink({ className }: { className?: string }) {
  return (
    <a
      href="/api/health"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[0.8125rem] font-medium whitespace-nowrap text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-success-solid opacity-60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-success-solid" />
      </span>
      <PulseIcon size={15} aria-hidden="true" />
      Check lab readiness
    </a>
  );
}

export function AppShell({ session, section, sectionLinks = [], children }: {
  session: ShellSession;
  section: Section;
  sectionLinks?: SectionLink[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <BrandMark />
          <div className="min-w-0 leading-tight">
            <Link
              href="/"
              prefetch={false}
              className="block text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink hover:text-accent"
            >
              Procurement Hub
            </Link>
            <span className="text-xs text-ink-3">Synthetic enterprise lab</span>
          </div>
        </div>

        <div className="mx-3 flex items-center gap-2.5 rounded-lg border border-line bg-subtle px-3 py-2.5">
          <BuildingsIcon size={18} className="shrink-0 text-ink-3" aria-hidden="true" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-ink" translate="no">{session.tenantName}</p>
            <p className="text-xs text-ink-3">Tenant workspace</p>
          </div>
        </div>

        <nav aria-label="Primary" className="mt-5 grid gap-0.5 px-3">
          <NavLink href="/" current={section === "dashboard"}>
            <SquaresFourIcon size={18} aria-hidden="true" />
            Dashboard
          </NavLink>
          <NavLink href="/overview" current={section === "overview"}>
            <BookOpenTextIcon size={18} aria-hidden="true" />
            Overview
          </NavLink>
        </nav>

        {sectionLinks.length > 0 && (
          <nav aria-label="On this page" className="mt-6 px-3">
            <p className="px-2.5 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-3">
              On this page
            </p>
            <ul className="ml-2.5 grid gap-0.5 border-l border-line">
              {sectionLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="-ml-px block border-l border-transparent py-1 pl-3 text-[0.8125rem] text-ink-3 transition-colors duration-150 hover:border-ink-3 hover:text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-auto grid gap-3 border-t border-line p-3">
          <HealthLink />
          <div className="flex items-center gap-2.5 px-1">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink"
              aria-hidden="true"
            >
              {initialsOf(session.displayName)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-ink">{session.displayName}</p>
              <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-ink-3">{session.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-surface lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2 font-semibold text-ink">
              <BrandMark />
              <span className="truncate">Procurement Hub</span>
            </Link>
            <nav aria-label="Primary" className="flex items-center gap-1">
              <NavLink href="/" current={section === "dashboard"}>Dashboard</NavLink>
              <NavLink href="/overview" current={section === "overview"}>Overview</NavLink>
            </nav>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
