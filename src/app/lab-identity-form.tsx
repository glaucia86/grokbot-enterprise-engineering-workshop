"use client";

import type { FormEvent } from "react";
import type { listLabIdentities } from "../server/auth/lab-session";
import { useLabIdentitySwitch } from "./_components/use-lab-identity-switch";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];

export function LabIdentityForm({ identities, selected }: {
  identities: Identity[];
  selected?: string;
}) {
  const { error, pending, switchTo } = useLabIdentitySwitch();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void switchTo(String(new FormData(event.currentTarget).get("identity")));
  }

  return (
    <form className="identity-form" onSubmit={submit} autoComplete="off">
      <div className="field">
        <label htmlFor="identity">Lab identity</label>
        <select id="identity" name="identity" defaultValue={selected ?? ""} required disabled={pending}>
          <option value="" disabled>Choose a synthetic identity…</option>
          {identities.map(({ key, tenantName, displayName }) => key && (
            <option key={key} value={key}>{tenantName} · {displayName}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending}>{pending ? "Switching…" : "Switch identity"}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
