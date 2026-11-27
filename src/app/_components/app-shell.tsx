import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenTextIcon, BuildingsIcon, PulseIcon, ShieldCheckIcon, SquaresFourIcon } from "./icons";
import { initialsOf } from "./initials";
import { cn } from "./ui";

type ShellSession = { displayName: string; role: string; tenantName: string };
type Section = "dashboard" | "overview" | "detail";

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
        current ? "bg-night-raised text-white" : "text-night-muted hover:bg-night-raised hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

export function HealthLink({ tone = "default", className }: { tone?: "default" | "night"; className?: string }) {
  return (
    <a
      href="/api/health"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150",
        tone === "night"
          ? "border-night-line bg-night-raised text-night-ink hover:border-white/20 hover:text-white"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
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

export function AppShell({ session, section, children }: {
  session: ShellSession;
  section: Section;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-night text-night-ink lg:flex">
        <Link href="/" prefetch={false} className="flex items-center gap-2.5 px-5 pt-6 pb-6 font-semibold tracking-[-0.01em] text-white">
          <BrandMark />
          Procurement Hub
        </Link>

        <nav aria-label="Primary" className="grid gap-0.5 px-3">
          <NavLink href="/" current={section === "dashboard"}>
            <SquaresFourIcon size={18} aria-hidden="true" />
            Dashboard
          </NavLink>
          <NavLink href="/overview" current={section === "overview"}>
            <BookOpenTextIcon size={18} aria-hidden="true" />
            Overview
          </NavLink>
        </nav>

        <div className="mt-auto grid gap-4 p-4">
          <HealthLink tone="night" />
          <div className="flex items-center gap-3 border-t border-night-line pt-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-night-raised text-xs font-semibold text-white" aria-hidden="true">
              {initialsOf(session.displayName)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-white">{session.displayName}</p>
              <p className="flex items-center gap-1 truncate text-xs text-night-muted">
                <BuildingsIcon size={12} aria-hidden="true" />
                <span translate="no">{session.tenantName}</span>
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 bg-night text-night-ink lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-2 font-semibold text-white">
              <BrandMark />
              <span className="truncate">Procurement Hub</span>
            </Link>
            <nav aria-label="Primary" className="flex items-center gap-1">
              <NavLink href="/" current={section === "dashboard"}>Dashboard</NavLink>
              <NavLink href="/overview" current={section === "overview"}>Overview</NavLink>
            </nav>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[84rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
