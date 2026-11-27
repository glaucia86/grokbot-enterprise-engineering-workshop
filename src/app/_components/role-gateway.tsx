"use client";

import type { CSSProperties, ReactNode } from "react";
import type { listLabIdentities } from "../../server/auth/lab-session";
import { formatUsd } from "../format-purchase";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  EyeIcon,
  PencilSimpleLineIcon,
  StampIcon,
  XCircleIcon,
} from "./icons";
import { card, cn } from "./ui";
import { useLabIdentitySwitch } from "./use-lab-identity-switch";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];

const roles: {
  role: string;
  name: string;
  icon: ReactNode;
  summary: string;
  can: string[];
  cannot: string[];
}[] = [
  {
    role: "REQUESTER",
    name: "Requester",
    icon: <PencilSimpleLineIcon size={22} weight="duotone" />,
    summary: "Raises purchase requests against a cost center and follows them to a decision.",
    can: ["Submit idempotent requests", "See only their own requests"],
    cannot: ["Approve or reject", "Read the audit trail"],
  },
  {
    role: "APPROVER",
    name: "Approver",
    icon: <StampIcon size={22} weight="duotone" />,
    summary: "Decides pending requests inside an organizational approval limit.",
    can: ["Approve within their limit", "Reject with a documented reason"],
    cannot: ["Approve their own request", "Exceed available budget"],
  },
  {
    role: "AUDITOR",
    name: "Auditor",
    icon: <EyeIcon size={22} weight="duotone" />,
    summary: "Read-only oversight of every request, commitment, and audit event.",
    can: ["Inspect the full tenant queue", "Trace every decision"],
    cannot: ["Submit requests", "Record decisions"],
  },
];

export function RoleGateway({ identities, activeKey }: { identities: Identity[]; activeKey?: string }) {
  const { error, pending, pendingIdentity, switchTo } = useLabIdentitySwitch();

  return (
    <div className="grid gap-4">
      <ul className="grid gap-4 lg:grid-cols-3">
        {roles.map((role, index) => {
          const members = identities.filter((identity) => identity.role === role.role && identity.key);
          return (
            <li
              key={role.role}
              className={cn(card, "view-rise flex flex-col")}
              style={{ "--rise": 24 + index * 16 } as CSSProperties}
            >
              <div className="grid gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg border border-accent-line bg-accent-soft text-accent" aria-hidden="true">
                    {role.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">{role.name}</h3>
                    <p className="font-mono text-[0.6875rem] tracking-[0.06em] text-ink-3">{role.role}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-ink-2">{role.summary}</p>
                <ul className="grid gap-1.5 text-[0.8125rem]">
                  {role.can.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-ink-2">
                      <CheckCircleIcon size={15} weight="fill" className="shrink-0 text-success-solid" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                  {role.cannot.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-ink-3">
                      <XCircleIcon size={15} className="shrink-0" aria-hidden="true" />
                      <span><span className="sr-only">Cannot: </span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="mt-auto divide-y divide-line border-t border-line">
                {members.map((identity) => {
                  const key = identity.key as string;
                  const active = key === activeKey;
                  return (
                    <li key={key} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-sm font-medium text-ink">{identity.displayName}</p>
                        <p className="truncate text-xs text-ink-3">
                          {identity.tenantName}
                          {identity.approvalLimitMinor !== null && (
                            <> · limit <span className="font-mono tabular-nums">{formatUsd(identity.approvalLimitMinor)}</span></>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={pending || active}
                        onClick={() => void switchTo(key)}
                        aria-label={active ? `${identity.displayName} is the current session` : `Enter as ${identity.displayName}`}
                        className={cn(
                          "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[0.8125rem] font-semibold transition-colors duration-150 active:scale-[0.97] disabled:cursor-default",
                          active
                            ? "border-success-line bg-success-soft text-success"
                            : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent disabled:opacity-60",
                        )}
                      >
                        {pendingIdentity === key ? (
                          <CircleNotchIcon size={14} className="animate-spin" aria-hidden="true" />
                        ) : null}
                        {active ? "Current" : "Enter"}
                        {!active && pendingIdentity !== key && <ArrowRightIcon size={14} aria-hidden="true" />}
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
