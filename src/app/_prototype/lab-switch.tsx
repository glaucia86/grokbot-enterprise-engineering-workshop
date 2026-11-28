"use client";

/* Synthetic lab identity selection; authorization remains on the session endpoint. */
import { useState, type ReactNode } from "react";
import type { Identity } from "./data";

async function select(identity: string, destination: string) {
  const response = await fetch("/api/lab/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity }),
  });
  if (!response.ok) throw new Error("Identity selection failed");
  window.location.assign(destination);
}

export function LabSelect({ identities, current, className, selectClassName, buttonClassName }: {
  identities: Identity[];
  current?: string | null;
  className?: string;
  selectClassName?: string;
  buttonClassName?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        select(String(new FormData(event.currentTarget).get("identity")), "/dashboard").catch(() => {
          setError("Could not switch the lab identity.");
          setPending(false);
        });
      }}
    >
      <label className="sr-only" htmlFor="lab-identity">Lab identity</label>
      <select id="lab-identity" name="identity" defaultValue={current ?? ""} className={selectClassName} required disabled={pending}>
        {identities.map((identity) => identity.key && (
          <option key={identity.key} value={identity.key}>
            {identity.tenantName} · {identity.displayName}
          </option>
        ))}
      </select>
      <button type="submit" className={buttonClassName} disabled={pending}>{pending ? "Switching…" : "Switch identity"}</button>
      {error && <span role="alert" className="text-xs">{error}</span>}
    </form>
  );
}

export function PersonaButton({ identity, destination, className, children }: {
  identity: string;
  destination: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          setPending(true);
          setError("");
          select(identity, destination).catch(() => {
            setError("Could not open the workspace. Check lab readiness and try again.");
            setPending(false);
          });
        }}
      >
        {children}
      </button>
      {error && <p role="alert" className="text-sm text-(--p-violation)">{error}</p>}
    </>
  );
}
