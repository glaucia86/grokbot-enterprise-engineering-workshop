"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "./format-purchase";

type Attempt = { payload: string; key: string };
type CostCenterOption = { id: string; code: string; name: string; availableBudgetMinor: number };

export function PurchaseRequestForm({ costCenters }: { costCenters: CostCenterOption[] }) {
  const router = useRouter();
  const attempt = useRef<Attempt | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const payload = JSON.stringify({
      costCenterId: String(fields.get("costCenterId")),
      title: String(fields.get("title")).trim(),
      justification: String(fields.get("justification")).trim(),
      amountMinor: Number(fields.get("amountMinor")),
      currency: "USD",
    });
    if (attempt.current?.payload !== payload) {
      attempt.current = { payload, key: crypto.randomUUID() };
    }

    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key },
        body: payload,
      });
      if (response.ok) {
        const { id } = await response.json();
        router.push("/requests/" + id);
        return;
      }
      setError(response.status === 409
        ? "This submission key is in use. Refresh the page to start a new request."
        : "Could not submit the request. Check the fields and your lab session.");
    } catch {
      setError("The lab could not confirm the submission. Retry to keep the same submission key.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="request-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="cost-center">Cost center</label>
        <select id="cost-center" name="costCenterId" required defaultValue={costCenters[0]?.id ?? ""}>
          {costCenters.map((center) => (
            <option key={center.id} value={center.id}>
              {center.code} — {center.name} (Available: {formatUsd(center.availableBudgetMinor)})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" maxLength={120} required />
      </div>
      <div className="field">
        <label htmlFor="justification">Justification</label>
        <textarea id="justification" name="justification" maxLength={2_000} rows={3} required />
      </div>
      <div className="field amount-field">
        <label htmlFor="amount">Amount (USD cents)</label>
        <input id="amount" name="amountMinor" type="number" min={1} max={Number.MAX_SAFE_INTEGER} step={1} required />
      </div>
      <button type="submit" disabled={pending || costCenters.length === 0}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
