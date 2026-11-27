"use client";

import type { FormEvent } from "react";
import type { listLabIdentities } from "../server/auth/lab-session";
import { CircleNotchIcon } from "./_components/icons";
import { button, cn, control, controlNight, field, label, labelNight } from "./_components/ui";
import { useLabIdentitySwitch } from "./_components/use-lab-identity-switch";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];

export function LabIdentityForm({ identities, selected, layout = "inline", tone = "default" }: {
  identities: Identity[];
  selected?: string;
  layout?: "inline" | "stacked";
  tone?: "default" | "night";
}) {
  const night = tone === "night";
  const { error, pending, switchTo } = useLabIdentitySwitch();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void switchTo(String(new FormData(event.currentTarget).get("identity")));
  }

  return (
    <form
      className={cn("grid gap-2", layout === "inline" && "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end")}
      onSubmit={submit}
      autoComplete="off"
    >
      <div className={field}>
        <label htmlFor="identity" className={night ? labelNight : label}>Lab identity</label>
        <select
          id="identity"
          name="identity"
          defaultValue={selected ?? ""}
          required
          disabled={pending}
          className={cn(night ? controlNight : control, "select-chevron")}
        >
          <option value="" disabled>Choose a synthetic identity…</option>
          {identities.map(({ key, tenantName, displayName }) => key && (
            <option key={key} value={key}>{tenantName} · {displayName}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className={cn(button.primary, layout === "stacked" && "w-full")}>
        {pending && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
        {pending ? "Switching…" : "Switch identity"}
      </button>
      {error && (
        <p className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger sm:col-span-full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
