"use client";

import type { ReactNode } from "react";
import type { listLabIdentities } from "../../server/auth/lab-session";
import { formatUsd } from "../format-purchase";
import { ArrowRightIcon, CircleNotchIcon, EyeIcon, PencilSimpleLineIcon, StampIcon } from "./icons";
import { card, cn } from "./ui";
import { useLabIdentitySwitch } from "./use-lab-identity-switch";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];

const roles: { role: string; name: string; icon: ReactNode; summary: string }[] = [
  { role: "REQUESTER", name: "Requester", icon: <PencilSimpleLineIcon size={20} weight="duotone" />, summary: "Raises purchase requests." },
  { role: "APPROVER", name: "Approver", icon: <StampIcon size={20} weight="duotone" />, summary: "Decides within a limit." },
  { role: "AUDITOR", name: "Auditor", icon: <EyeIcon size={20} weight="duotone" />, summary: "Traces every decision." },
];

export function RoleGateway({ identities, activeKey }: { identities: Identity[]; activeKey?: string }) {
  const { error, pending, pendingIdentity, switchTo } = useLabIdentitySwitch();

  return (
    <div className="grid gap-4">
      <ul className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => {
          const members = identities.filter((identity) => identity.role === role.role && identity.key);
          return (
            <li key={role.role} className={cn(card, "flex flex-col overflow-hidden")} data-tilt>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                <span className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent" aria-hidden="true">
                  {role.icon}
                </span>
                <div className="leading-tight">
                  <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">{role.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-3">{role.summary}</p>
                </div>
              </div>
              <ul className="mt-auto divide-y divide-line border-t border-line">
                {members.map((identity) => {
                  const key = identity.key as string;
                  const active = key === activeKey;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={pending || active}
                        onClick={() => void switchTo(key)}
                        aria-label={active ? `${identity.displayName} is the current session` : `Enter as ${identity.displayName}`}
                        className="spotlight group flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-subtle disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate text-sm font-medium text-ink">{identity.displayName}</span>
                          <span className="block truncate text-xs text-ink-3">
                            {identity.tenantName}
                            {identity.approvalLimitMinor !== null && (
                              <> · <span className="font-mono tabular-nums">{formatUsd(identity.approvalLimitMinor)}</span></>
                            )}
                          </span>
                        </span>
                        {active ? (
                          <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">Current</span>
                        ) : pendingIdentity === key ? (
                          <CircleNotchIcon size={16} className="shrink-0 animate-spin text-accent" aria-hidden="true" />
                        ) : (
                          <ArrowRightIcon
                            size={16}
                            className="shrink-0 text-ink-3 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
