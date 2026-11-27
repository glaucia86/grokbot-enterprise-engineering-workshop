/* Illustrative presentation data only. Never derived from a tenant or used to authorize a decision. */
export const illustrativePurchase = {
  title: "Cloud security tooling",
  costCenter: "Platform Engineering",
  costCenterCode: "CC-ENG-01",
  allocatedMinor: 1_000_000,
  requestedMinor: 700_000,
} as const;

const remainingMinor = illustrativePurchase.allocatedMinor - illustrativePurchase.requestedMinor;

export const financialChapters = [
  {
    id: "story-submit",
    action: "Submit request",
    title: "A request, with context.",
    description: "Cloud security tooling enters the review queue with its purpose, amount, and cost center attached.",
    metricLabel: "Requested",
    metric: illustrativePurchase.requestedMinor,
    metricIsMoney: true,
    status: "Pending decision",
    committedMinor: 0,
    note: "Submission leaves the budget untouched.",
    facts: [
      { label: "Allocated budget", value: illustrativePurchase.allocatedMinor },
      { label: "Committed", value: 0 },
    ],
  },
  {
    id: "story-review",
    action: "Review impact",
    title: "Know the impact first.",
    description: "An approver checks their authority and the available budget before making the decision.",
    metricLabel: "Available if approved",
    metric: remainingMinor,
    metricIsMoney: true,
    status: "Awaiting confirmation",
    committedMinor: 0,
    note: "A projected balance. No commitment yet.",
    facts: [
      { label: "Available now", value: illustrativePurchase.allocatedMinor },
      { label: "Requested", value: illustrativePurchase.requestedMinor },
    ],
  },
  {
    id: "story-record",
    action: "Record approval",
    title: "One decision. One commitment.",
    description: "In the intended successful outcome, the approval, financial commitment, and audit event are recorded together.",
    metricLabel: "Committed after approval",
    metric: illustrativePurchase.requestedMinor,
    metricIsMoney: true,
    status: "Approved (illustrative)",
    committedMinor: illustrativePurchase.requestedMinor,
    note: "An illustrated outcome, not a real approval.",
    facts: [
      { label: "Allocated budget", value: illustrativePurchase.allocatedMinor },
      { label: "Available after approval", value: remainingMinor },
    ],
  },
  {
    id: "story-trace",
    action: "Trace the outcome",
    title: "Follow every decision.",
    description: "An authorized auditor can trace the request and approval back to the people who made the decision.",
    metricLabel: "Audit events in this example",
    metric: 2,
    metricIsMoney: false,
    status: "Approved (illustrative)",
    committedMinor: illustrativePurchase.requestedMinor,
    note: "This story explains the intended flow. It is not verification evidence.",
    facts: [
      { label: "Committed", value: illustrativePurchase.requestedMinor },
      { label: "Available", value: remainingMinor },
    ],
  },
] as const;

export type FinancialChapter = (typeof financialChapters)[number];
