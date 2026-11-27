import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheckIcon, ArrowUpRightIcon, PulseIcon } from "../_components/icons";
import type { Identity, Session } from "./data";
import { LabSelect } from "./lab-switch";
import "./experience-b.css";

export function ShellB({ session, identities, nav, children }: {
  session: Session;
  identities: Identity[];
  nav: { href: string; label: string; icon: ReactNode; current?: boolean; count?: number }[];
  children: ReactNode;
}) {
  return (
    <div className="pb ph-workspace">
      <aside className="ph-sidebar">
        <Link href="/home" className="ph-sidebar-brand"><span className="ph-brand-icon"><ShieldCheckIcon size={22} /></span>Procurement Hub</Link>
        <span className="ph-sidebar-label">OPERATIONS</span>
        <nav aria-label="Workspace" className="flex flex-wrap gap-1 md:flex-col">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined} className="ph-sidebar-link">
              <span aria-hidden="true">{item.icon}</span>{item.label}
              {item.count !== undefined && item.count > 0 && <span className="ph-sidebar-count">{item.count}</span>}
            </Link>
          ))}
          <Link href="/home" className="ph-sidebar-link"><ArrowUpRightIcon size={18} aria-hidden="true" /> Product home</Link>
        </nav>
        <div className="ph-sidebar-foot"><a className="ph-sidebar-link" href="/api/health"><PulseIcon size={18} aria-hidden="true" /> Check lab readiness</a></div>
      </aside>
      <div className="ph-workspace-main">
        <header className="ph-topbar">
          <div className="ph-topbar-meta"><p className="session-state"><strong translate="no">{session.tenantName}</strong> · {session.displayName} · {session.role}</p></div>
          <LabSelect identities={identities} current={session.key} className="flex items-center gap-2"
            selectClassName="min-h-9 min-w-0 max-w-full rounded-md border border-(--p-line-strong) bg-(--p-surface) px-2 text-xs"
            buttonClassName="min-h-9 rounded-md border border-(--p-line-strong) px-3 text-xs font-semibold hover:bg-(--p-track)" />
        </header>
        <main id="main-content" className="ph-workspace-body">{children}</main>
      </div>
    </div>
  );
}
