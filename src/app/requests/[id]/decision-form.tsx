"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

const decisionErrors: Partial<Record<number, string>> = {
  400: "Choose a decision and provide a reason when rejecting.",
  401: "Your lab session has expired. Switch your lab identity to continue.",
  403: "Your lab identity cannot decide this request.",
  404: "This request is unavailable to your lab identity.",
};

export function DecisionForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const busy = submitting || refreshing;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const fields = new FormData(event.currentTarget);
    const reason = decision === "REJECT" ? String(fields.get("reason") ?? "").trim() : undefined;
    if (decision === "REJECT" && !reason) {
      setError("Provide a reason for the rejection.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/purchase-requests/${requestId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      if (response.ok || response.status === 409) {
        if (response.status === 409) setError("This request already has a decision.");
        startTransition(() => router.refresh());
      } else {
        setError(decisionErrors[response.status] ?? "Could not save the decision. Try again.");
      }
    } catch {
      setError("The lab could not confirm the decision. Refresh the page to check its status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="request-form" onSubmit={submit} aria-busy={busy}>
      <div className="field">
        <label htmlFor="decision">Decision</label>
        <select id="decision" required disabled={busy} value={decision} onChange={(event) => {
          setDecision(event.target.value);
          setError("");
        }}>
          <option value="" disabled>Choose a decision</option>
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
        </select>
      </div>
      {decision === "REJECT" && (
        <div className="field">
          <label htmlFor="rejection-reason">Rejection reason</label>
          <textarea id="rejection-reason" name="reason" required maxLength={2_000} rows={3} disabled={busy} />
        </div>
      )}
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save decision"}</button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
