import Link from "next/link";
import { ActivityIcon, ShieldCheckIcon } from "./icons";
import { initialsOf } from "./initials";

type TopbarSession = { displayName: string; role: string; tenantName: string };
type TopbarSection = "overview" | "dashboard" | "detail";

export function AppTopbar({ session, section, tone = "light" }: {
  session?: TopbarSession;
  section: TopbarSection;
  tone?: "light" | "dark";
}) {
  return (
    <header className={tone === "dark" ? "app-topbar app-topbar-dark" : "app-topbar"}>
      <div className="app-topbar-inner">
        <div className="brand-group">
          <span className="brand-mark" aria-hidden="true"><ShieldCheckIcon size={19} /></span>
          <div className="brand-text">
            <Link href={session ? "/" : "/overview"} prefetch={false} className="brand-title">Procurement Hub</Link>
            <span className="env-badge" translate="no">{session ? session.tenantName : "Synthetic Enterprise Lab"}</span>
          </div>
        </div>

        {session && (
          <nav className="topnav" aria-label="Primary">
            <Link
              href="/overview"
              prefetch={false}
              className="topnav-link"
              aria-current={section === "overview" ? "page" : undefined}
            >
              Overview
            </Link>
            <Link
              href="/"
              prefetch={false}
              className="topnav-link"
              aria-current={section === "dashboard" ? "page" : undefined}
            >
              Dashboard
            </Link>
          </nav>
        )}

        <div className="topbar-actions">
          {session && (
            <span className="session-chip">
              <span className="avatar" aria-hidden="true">{initialsOf(session.displayName)}</span>
              <span className="session-chip-text">
                <span className="session-chip-name">{session.displayName}</span>
                <span className="session-chip-role">{session.role}</span>
              </span>
            </span>
          )}
          <a className="health-link" href="/api/health">
            <span className="health-dot" aria-hidden="true" />
            <ActivityIcon size={15} />
            Check lab readiness
          </a>
        </div>
      </div>
    </header>
  );
}
