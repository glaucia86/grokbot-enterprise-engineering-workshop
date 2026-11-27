"use client";

import { useState, type FormEvent } from "react";
import type { listLabIdentities } from "../server/auth/lab-session";

type Identity = Awaited<ReturnType<typeof listLabIdentities>>[number];

export function LabIdentityForm({ identities, selected }: {
  identities: Identity[];
  selected?: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function switchIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const identity = new FormData(event.currentTarget).get("identity");
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/lab/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });
      if (!response.ok) throw new Error("Identity selection failed");
      window.location.replace("/");
    } catch {
      setError("Could not start the lab session. Check lab readiness and try again.");
      setPending(false);
    }
  }

  return (
    <form className="identity-form" onSubmit={switchIdentity} autoComplete="off">
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
