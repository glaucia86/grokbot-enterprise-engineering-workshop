"use client";

import { useId, useState } from "react";
import { formatUsd } from "../format-purchase";

const steps = [
  { title: "Submit request", status: "Pending decision", amount: 0, events: "1 · Request submitted", detail: "A requester submits a $7,000 purchase. No budget has been committed." },
  { title: "Review impact", status: "Awaiting confirmation", amount: 0, events: "1 · Request submitted", detail: "The approver sees the available budget, the request and the projected $3,000 balance. No money has moved." },
  { title: "Record approval", status: "Approved (illustrative)", amount: 700_000, events: "2 · Approval recorded", detail: "In the intended successful outcome, the purchase and its financial commitment are recorded together." },
  { title: "Trace the outcome", status: "Approved (illustrative)", amount: 700_000, events: "2 · Durable audit events", detail: "An authorized auditor can trace the request and approval. This walkthrough is simulated, not evidence of a real transaction." },
] as const;

export function FinancialStory() {
  const [active, setActive] = useState(0);
  const id = useId();
  const step = steps[active];
  const allocated = 1_000_000;
  return (
    <div className="ph-story">
      <div className="ph-story-steps" role="group" aria-label="Illustrative decision steps">
        {steps.map((item, index) => <button type="button" key={item.title} aria-pressed={index === active}
          aria-controls={id} onClick={() => setActive(index)} className={index === active ? "ph-story-step is-active" : "ph-story-step"}>
          <span>{String(index + 1).padStart(2, "0")}</span><span>{item.title}</span><span aria-hidden="true">→</span>
        </button>)}
      </div>
      <div className="ph-story-paper" id={id} aria-live="polite">
        <div className="ph-story-top"><span>Illustrative ledger</span><span>CC-ENG-01 / USD</span></div>
        <p className="ph-story-status">{step.status}</p>
        <h3>Cloud security tooling</h3>
        <dl className="ph-story-values">
          <div><dt>Requested amount</dt><dd>{formatUsd(700_000)}</dd></div>
          <div><dt>Committed</dt><dd>{formatUsd(step.amount)}</dd></div>
          <div><dt>Available</dt><dd>{formatUsd(allocated - step.amount)}</dd></div>
          {active === 1 && <div><dt>If approved</dt><dd>{formatUsd(300_000)}</dd></div>}
        </dl>
        <div className="ph-story-bar" aria-hidden="true"><span style={{ width: (step.amount / allocated * 100) + "%" }} /></div>
        <p className="ph-story-detail">{step.detail}</p>
        <p className="ph-story-events">{step.events}</p>
        <small>Simulation only — no API call or financial mutation.</small>
      </div>
    </div>
  );
}
