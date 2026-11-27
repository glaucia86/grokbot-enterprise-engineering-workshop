"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { utilizationTone } from "./_components/utilization-ring";
import { computeUtilizationPercent, formatUsd } from "./format-purchase";

type Attempt = { payload: string; key: string };
type CostCenterOption = {
  id: string;
  code: string;
  name: string;
  allocatedBudgetMinor: number;
  committedBudgetMinor: number;
  availableBudgetMinor: number;
};

export function PurchaseRequestForm({ costCenters }: { costCenters: CostCenterOption[] }) {
  const router = useRouter();
  const attempt = useRef<Attempt | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState(costCenters[0]?.id ?? "");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const selectedCenter = costCenters.find((c) => c.id === selectedCenterId) ?? costCenters[0];
  const parsedAmount = Number(amountInput);
  const validPreview = amountInput.trim() !== "" && Number.isSafeInteger(parsedAmount) && parsedAmount >= 1;
  const exceedsAvailable = validPreview && selectedCenter !== undefined && parsedAmount > selectedCenter.availableBudgetMinor;
  const currentPct = selectedCenter
    ? computeUtilizationPercent(selectedCenter.allocatedBudgetMinor, selectedCenter.committedBudgetMinor)
    : 0;
  const projectedPct = selectedCenter && validPreview
    ? computeUtilizationPercent(selectedCenter.allocatedBudgetMinor, selectedCenter.committedBudgetMinor + parsedAmount)
    : currentPct;
  const projectedTone = utilizationTone(projectedPct, exceedsAvailable);
  const clampPct = (value: number) => Math.min(100, Math.max(0, value));

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
    <form className="request-form" onSubmit={submit} autoComplete="off">
      <div className="field">
        <label htmlFor="cost-center">Cost center</label>
        <select
          id="cost-center"
          name="costCenterId"
          required
          value={selectedCenterId}
          onChange={(event) => setSelectedCenterId(event.target.value)}
        >
          {costCenters.map((center) => (
            <option key={center.id} value={center.id}>
              {center.code} — {center.name} (Available: {formatUsd(center.availableBudgetMinor)})
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" maxLength={120} placeholder="e.g. Cloud Security Audit Tooling…" required />
      </div>
      <div className="field">
        <label htmlFor="justification">Justification</label>
        <textarea
          id="justification"
          name="justification"
          maxLength={2_000}
          rows={3}
          placeholder="Business need, vendor scope, and cost-center alignment…"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="amount">Amount (USD cents)</label>
        <div className="amount-input-row">
          <input
            id="amount"
            name="amountMinor"
            type="number"
            inputMode="numeric"
            min={1}
            max={Number.MAX_SAFE_INTEGER}
            step={1}
            className="amount-field-input"
            placeholder="700000"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            required
          />
          {validPreview && (
            <span
              className={exceedsAvailable ? "currency-preview currency-preview-warn" : "currency-preview"}
              aria-live="polite"
            >
              = {formatUsd(parsedAmount)} USD
            </span>
          )}
        </div>
        {selectedCenter && (
          <div className="projection">
            <div className="meter-header">
              <span>{validPreview ? "Projected utilization if approved" : `${selectedCenter.code} current utilization`}</span>
              <span className="mono">{validPreview ? `${currentPct}% → ${projectedPct}%` : `${currentPct}%`}</span>
            </div>
            <div className="meter-track meter-track-lg" aria-hidden="true">
              <div className={"meter-fill meter-fill-" + utilizationTone(currentPct, selectedCenter.availableBudgetMinor < 0)} style={{ width: `${clampPct(currentPct)}%` }} />
              {validPreview && projectedPct > currentPct && (
                <div
                  className={"meter-projected meter-projected-" + projectedTone}
                  style={{ left: `${clampPct(currentPct)}%`, width: `${clampPct(projectedPct) - clampPct(currentPct)}%` }}
                />
              )}
              <span className="meter-threshold" />
            </div>
          </div>
        )}
        <p className={exceedsAvailable ? "field-hint field-hint-warn" : "field-hint"}>
          {exceedsAvailable && selectedCenter
            ? `Exceeds current available budget for ${selectedCenter.code} (${formatUsd(selectedCenter.availableBudgetMinor)}). Approval will require sufficient remaining funds.`
            : "Stored in exact integer minor units (100 cents = $1.00). Idempotency key is retained automatically on retry."}
        </p>
      </div>
      <button type="submit" className="btn-block" disabled={pending || costCenters.length === 0}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
