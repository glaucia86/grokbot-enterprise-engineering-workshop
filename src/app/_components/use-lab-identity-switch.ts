import { useState } from "react";

export function useLabIdentitySwitch() {
  const [error, setError] = useState("");
  const [pendingIdentity, setPendingIdentity] = useState<string | null>(null);

  async function switchTo(identity: string) {
    setError("");
    setPendingIdentity(identity);
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
      setPendingIdentity(null);
    }
  }

  return { error, pending: pendingIdentity !== null, pendingIdentity, switchTo };
}
