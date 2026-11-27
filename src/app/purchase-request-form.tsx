"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BudgetBar } from "./_components/budget-bar";
import { CircleNotchIcon, InfoIcon, WarningIcon } from "./_components/icons";
import { button, cn, control, field, label } from "./_components/ui";
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
    <form className="grid gap-4" onSubmit={submit} autoComplete="off">
      <div className={field}>
        <label htmlFor="cost-center" className={label}>Cost center</label>
        <select
          id="cost-center"
          name="costCenterId"
          required
          value={selectedCenterId}
          onChange={(event) => setSelectedCenterId(event.target.value)}
          className={cn(control, "select-chevron")}
        >
          {costCenters.map((center) => (
            <option key={center.id} value={center.id}>
              {center.code} — {center.name} (Available: {formatUsd(center.availableBudgetMinor)})
            </option>
          ))}
        </select>
      </div>
      <div className={field}>
        <label htmlFor="title" className={label}>Title</label>
        <input id="title" name="title" maxLength={120} placeholder="e.g. Cloud Security Audit Tooling…" required className={control} />
      </div>
      <div className={field}>
        <label htmlFor="justification" className={label}>Justification</label>
        <textarea
          id="justification"
          name="justification"
          maxLength={2_000}
          rows={3}
          placeholder="Business need, vendor scope, and cost-center alignment…"
          required
          className={cn(control, "resize-y leading-relaxed")}
        />
      </div>
      <div className={field}>
        <label htmlFor="amount" className={label}>Amount (USD cents)</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="amount"
            name="amountMinor"
            type="number"
            inputMode="numeric"
            min={1}
            max={Number.MAX_SAFE_INTEGER}
            step={1}
            placeholder="700000"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            required
            className={cn(control, "max-w-44 font-mono tabular-nums")}
          />
          {validPreview && (
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 font-mono text-sm font-semibold tabular-nums",
                exceedsAvailable ? "border-warning-line bg-warning-soft text-warning" : "border-accent-line bg-accent-soft text-accent-ink",
              )}
              aria-live="polite"
            >
              = {formatUsd(parsedAmount)} USD
            </span>
          )}
        </div>

        {selectedCenter && (
          <div className="mt-1.5 grid gap-1.5 rounded-lg border border-line bg-subtle px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2 text-xs text-ink-3">
              <span>{validPreview ? "Projected utilization if approved" : `${selectedCenter.code} current utilization`}</span>
              <span className="font-mono tabular-nums text-ink-2">
                {validPreview ? `${currentPct}% → ${projectedPct}%` : `${currentPct}%`}
              </span>
            </div>
            <BudgetBar
              allocatedMinor={selectedCenter.allocatedBudgetMinor}
              committedMinor={selectedCenter.committedBudgetMinor}
              pendingMinor={validPreview ? parsedAmount : 0}
            />
          </div>
        )}

        <p className={cn("flex items-start gap-1.5 text-xs", exceedsAvailable ? "font-medium text-warning" : "text-ink-3")}>
          {exceedsAvailable
            ? <WarningIcon size={14} className="mt-px shrink-0" aria-hidden="true" />
            : <InfoIcon size={14} className="mt-px shrink-0" aria-hidden="true" />}
          <span>
            {exceedsAvailable && selectedCenter
              ? `Exceeds current available budget for ${selectedCenter.code} (${formatUsd(selectedCenter.availableBudgetMinor)}). Approval will require sufficient remaining funds.`
              : "Stored in exact integer minor units (100 cents = $1.00). Idempotency key is retained automatically on retry."}
          </span>
        </p>
      </div>
      <button type="submit" disabled={pending || costCenters.length === 0} className={cn(button.primary, "w-full")}>
        {pending && <CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />}
        {pending ? "Submitting…" : "Submit request"}
      </button>
      {error && (
        <p className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
