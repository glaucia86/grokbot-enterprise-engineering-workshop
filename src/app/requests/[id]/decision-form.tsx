"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";

type Attempt = { payload: string; key: string };

const errorCodeMessages: Record<string, string> = {
  INVALID_INPUT: "Choose a decision and provide a reason when rejecting.",
  UNAUTHENTICATED: "Your lab session has expired. Switch your lab identity to continue.",
  FORBIDDEN: "Your lab identity cannot decide this request.",
  APPROVAL_LIMIT_EXCEEDED: "This request exceeds your organizational approval limit.",
  NOT_FOUND: "This request is unavailable to your lab identity.",
  INSUFFICIENT_BUDGET: "Insufficient available budget in the cost center to approve this request.",
  IDEMPOTENCY_CONFLICT: "This decision idempotency key was already used for a different decision.",
  INVALID_TRANSITION: "This request already has a terminal decision.",
};

export function DecisionForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const attempt = useRef<Attempt | null>(null);
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

    const payload = JSON.stringify({ decision, reason });
    if (attempt.current?.payload !== payload) {
      attempt.current = { payload, key: crypto.randomUUID() };
    }

    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/purchase-requests/${requestId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current.key,
        },
        body: payload,
      });
      if (response.ok) {
        startTransition(() => router.refresh());
        return;
      }
      const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      const code = body?.error?.code ?? "";
      setError(errorCodeMessages[code] ?? "Could not save the decision. Try again.");
      if (code === "INVALID_TRANSITION" || code === "INSUFFICIENT_BUDGET") {
        startTransition(() => router.refresh());
      }
    } catch {
      setError("The lab could not confirm the decision. Retry to reuse the same idempotency key safely.");
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
