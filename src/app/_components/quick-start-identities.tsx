"use client";

import type { listLabIdentities } from "../../server/auth/lab-session";
import { formatUsd } from "../format-purchase";
import { ArrowRightIcon, LockIcon } from "./icons";
import { stagger } from "./motion";
import { initialsOf, slugOf } from "./initials";
import { useLabIdentitySwitch } from "./use-lab-identity-switch";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];

const roleBlurbs: Record<string, string> = {
  REQUESTER: "Submits purchase requests against tenant cost centers and tracks their outcome.",
  APPROVER: "Approves or rejects pending requests, bounded by an organizational approval limit.",
  AUDITOR: "Read-only oversight of every request and its durable audit trail.",
};

export function QuickStartIdentities({ identities, activeKey }: { identities: Identity[]; activeKey?: string }) {
  const { error, pending, pendingIdentity, switchTo } = useLabIdentitySwitch();
  const tenants = [...new Set(identities.map((identity) => identity.tenantName))];

  return (
    <div className="persona-groups">
      {tenants.map((tenant) => (
        <section key={tenant} className="persona-group" aria-labelledby={"tenant-" + slugOf(tenant)}>
          <header className="persona-group-header">
            <h3 id={"tenant-" + slugOf(tenant)}>{tenant}</h3>
            <span className="persona-group-meta">Isolated tenant</span>
          </header>
          <ul className="persona-grid">
            {identities.filter((identity) => identity.tenantName === tenant).map((identity) => {
              const key = identity.key;
              if (!key) return null;
              const active = key === activeKey;
              return (
                <li key={key} className={active ? "persona-card persona-card-active reveal" : "persona-card reveal"} style={stagger(identities.indexOf(identity))}>
                  <div className="persona-head">
                    <span className={"avatar avatar-lg avatar-" + identity.role.toLowerCase()} aria-hidden="true">
                      {initialsOf(identity.displayName)}
                    </span>
                    <div className="persona-id">
                      <p className="persona-name">{identity.displayName}</p>
                      <span className="role-badge">{identity.role}</span>
                    </div>
                  </div>
                  <p className="persona-blurb">{roleBlurbs[identity.role] ?? "Synthetic lab persona."}</p>
                  <p className="persona-limit">
                    <LockIcon size={13} />
                    {identity.approvalLimitMinor !== null
                      ? <>Approval limit <span className="mono">{formatUsd(identity.approvalLimitMinor)}</span></>
                      : "No approval authority"}
                  </p>
                  <button
                    type="button"
                    className="btn-ghost persona-cta"
                    disabled={pending || active}
                    onClick={() => void switchTo(key)}
                  >
                    {active ? "Current session" : pendingIdentity === key ? "Starting…" : `Enter as ${identity.displayName}`}
                    {!active && <ArrowRightIcon size={15} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
