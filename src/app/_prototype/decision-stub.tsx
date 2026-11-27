"use client";

/*
 * PROTOTYPE decision interaction. It never calls the decision API. It only shows the intended flow:
 * explicit amount on the action, a confirmation stating the financial impact, a required rejection reason.
 */
import { useRef, useState } from "react";
import { formatUsd } from "../format-purchase";

export type DecisionImpact = {
  amountMinor: number;
  availableMinor: number;
  limitMinor: number | null;
  costCenterCode: string;
  canApprove: boolean;
  overLimit: boolean;
};

type Mode = "panel" | "footer" | "signature";

const styles: Record<Mode, { approve: string; reject: string; wrap: string }> = {
  panel: {
    wrap: "grid gap-2",
    approve: "min-h-11 w-full rounded-md bg-(--p-accent) px-4 text-sm font-semibold text-white hover:bg-(--p-accent-hover) disabled:cursor-not-allowed disabled:bg-(--p-line-strong) disabled:text-(--p-ink-3)",
    reject: "min-h-11 w-full rounded-md border border-(--p-line-strong) bg-(--p-surface) px-4 text-sm font-semibold text-(--p-ink) hover:border-(--p-ink-3)",
  },
  footer: {
    wrap: "flex flex-wrap items-center justify-end gap-2",
    approve: "min-h-11 rounded-md bg-(--p-accent) px-5 text-sm font-semibold text-white hover:bg-(--p-accent-hover) disabled:cursor-not-allowed disabled:bg-(--p-line-strong) disabled:text-(--p-ink-3)",
    reject: "min-h-11 rounded-md border border-(--p-line-strong) bg-(--p-surface) px-5 text-sm font-semibold text-(--p-ink) hover:border-(--p-ink-3)",
  },
  signature: {
    wrap: "flex flex-wrap items-center gap-3",
    approve: "min-h-11 rounded-sm bg-(--p-accent) px-6 text-sm font-semibold tracking-wide text-white hover:bg-(--p-accent-hover) disabled:cursor-not-allowed disabled:bg-(--p-line-strong) disabled:text-(--p-ink-3)",
    reject: "min-h-11 rounded-sm border border-(--p-ink) px-6 text-sm font-semibold tracking-wide text-(--p-ink) hover:bg-(--p-ink) hover:text-(--p-canvas)",
  },
};

export function DecisionStub({ impact, mode }: { impact: DecisionImpact; mode: Mode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState("");
  const projected = impact.availableMinor - impact.amountMinor;
  const style = styles[mode];

  function open(next: "approve" | "reject") {
    setKind(next);
    setReason("");
    setResult("");
    dialog.current?.showModal();
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium text-(--p-ink-3)">Design preview · decisions are simulated.</p>
      <div className={style.wrap}>
        <button type="button" className={style.approve} disabled={!impact.canApprove} onClick={() => open("approve")}>
          Approve {formatUsd(impact.amountMinor)}
        </button>
        <button type="button" className={style.reject} onClick={() => open("reject")}>Reject request</button>
      </div>
      {impact.overLimit && impact.limitMinor !== null && (
        <p className="text-[0.8125rem] text-(--p-ink-2)">
          Your approval limit is {formatUsd(impact.limitMinor)}. An approver with a higher limit must approve this request; you can still reject it.
        </p>
      )}
      {result && <p role="status" className="rounded-md border border-dashed border-(--p-line-strong) px-3 py-2 text-[0.8125rem] text-(--p-ink-2)">{result}</p>}

      <dialog
        ref={dialog}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-(--p-line) bg-(--p-surface) p-0 text-(--p-ink) shadow-[0_24px_64px_-24px_rgb(0_0_0/0.45)] backdrop:bg-black/40"
        aria-labelledby="decision-stub-title"
      >
        <form
          method="dialog"
          className="grid gap-4 p-6"
          onSubmit={(event) => {
            if (kind === "reject" && !reason.trim()) {
              event.preventDefault();
              return;
            }
            setResult("Prototype: no decision was recorded. Production sends the decision with an Idempotency-Key and shows success only after the server confirms it.");
          }}
        >
          <p className="text-xs font-semibold tracking-wide text-(--p-violation)">PROTOTYPE — no decision will be recorded</p>
          <h2 id="decision-stub-title" className="text-lg font-semibold">
            {kind === "approve" ? `Approve ${formatUsd(impact.amountMinor)}?` : "Reject this request?"}
          </h2>
          {kind === "approve" ? (
            <dl className="p-figures grid gap-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-(--p-ink-3)">Available in {impact.costCenterCode} now</dt><dd>{formatUsd(impact.availableMinor)}</dd></div>
              <div className="flex justify-between"><dt className="text-(--p-ink-3)">This request</dt><dd>−{formatUsd(impact.amountMinor)}</dd></div>
              <div className="flex justify-between border-t border-(--p-line) pt-1.5 font-semibold">
                <dt>Available after approval</dt>
                <dd className={projected < 0 ? "text-(--p-violation)" : undefined}>{formatUsd(projected)}</dd>
              </div>
              {projected < 0 && (
                <p className="mt-1 text-[0.8125rem] text-(--p-violation)">The server will refuse this approval unless budget is freed first.</p>
              )}
              <p className="mt-1 text-xs text-(--p-ink-3)">Figures are as of page load. The server rechecks budget and authority when you confirm.</p>
            </dl>
          ) : (
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Reason (required)</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={2_000}
                required
                className="rounded-md border border-(--p-line-strong) bg-(--p-surface) px-3 py-2 text-sm"
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="min-h-10 rounded-md px-4 text-sm font-medium text-(--p-ink-2) hover:bg-(--p-track)" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button type="submit" className="min-h-10 rounded-md bg-(--p-accent) px-4 text-sm font-semibold text-white hover:bg-(--p-accent-hover)">
              {kind === "approve" ? `Confirm approval of ${formatUsd(impact.amountMinor)}` : "Confirm rejection"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
