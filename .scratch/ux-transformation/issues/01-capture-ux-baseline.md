# Capture revision-bound UX baseline

Type: task
Status: open
Blocked by: none

## Question

What does the current experience actually look like and measure, per role, state and viewport, on a clean commit?

## Context

Plan §L UX-VS-00, §M (XR baselines). Capture spec `tests/e2e/experience/baseline.spec.ts` (gated by `WORKSHOP_UX_CAPTURE=1`). See [TRANSFORMATION-PLAN](../../../docs/experience/TRANSFORMATION-PLAN.md).

## Done when

A `verify:all` evidence bundle bound to a clean SHA holds screenshots, console/network/overflow observations and fold/click metrics for every role, state and viewport.
