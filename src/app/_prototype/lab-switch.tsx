"use client";

/* PROTOTYPE lab identity switch that keeps the current ?variant (the production switch resets to "/"). */
import { useState, type ReactNode } from "react";
import type { Identity } from "./data";

async function select(identity: string, destination?: string) {
  const response = await fetch("/api/lab/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity }),
  });
  if (!response.ok) throw new Error("Identity selection failed");
  if (destination) window.location.assign(destination);
  else window.location.reload();
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
        select(String(new FormData(event.currentTarget).get("identity"))).catch(() => {
          setError("Could not switch the lab identity.");
          setPending(false);
        });
      }}
    >
      <label className="sr-only" htmlFor="prototype-identity">Synthetic lab identity</label>
      <select id="prototype-identity" name="identity" defaultValue={current ?? ""} className={selectClassName} disabled={pending}>
        {identities.map((identity) => identity.key && (
          <option key={identity.key} value={identity.key}>
            {identity.tenantName} · {identity.displayName}
          </option>
        ))}
      </select>
      <button type="submit" className={buttonClassName} disabled={pending}>{pending ? "Switching…" : "Switch"}</button>
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
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        setPending(true);
        select(identity, destination).catch(() => setPending(false));
      }}
    >
      {children}
    </button>
  );
}
