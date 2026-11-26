# Rehearse and review a workshop release

## Independent verification

The **Workshop verification** workflow builds the exact pull request head, or the pushed revision on `main`, on a GitHub-hosted Ubuntu runner with Bun 1.4.5, disposable PostgreSQL and Chromium. Review the run for the expected SHA. The uploaded `workshop-evidence-*` artifact contains the revision, stage and check outcomes, timings and PH-42 counts. It expires after 14 days. A failed workflow remains a failed delivery gate.

For a protected delivery branch, an authorized maintainer can require the **Bun, PostgreSQL and Chromium** check and a human review. Confirm these settings in the destination repository before release.

## Prepare the checkouts

From a clean checkout of the approved source, run:

```bash
bun engineering/package-workshop.ts rehearsal
git clone --branch workshop/starter artifacts/release/rehearsal/starter.bundle ../starter-rehearsal
git clone --branch workshop/solution artifacts/release/rehearsal/solution.bundle ../solution-rehearsal
```

Start each clone from its own README. Verify the starter with `bun run verify:all --run-id participant` and the solution with `bun run verify:all --slice VS-05 --run-id reference`. Run the checks with a compatible installed Chromium, and add `--postgres-bin <dir>` for standalone PostgreSQL.

The starter ships the synthetic red PH-42 observation and the VS-04 runtime. It ships the original lab migration and fingerprint-based replay. The reference checkout adds the protected upgrade for legacy lab data and the canonical-payload replay check. Both bundles include one independent root commit. The export manifest records the authoring revision and both bundle revisions.

## Review before sharing

Review the starter's tracked paths and single reachable commit. Check that its README links resolve and that the instructor ADR, legacy migration, solution regression and authoring evidence are absent. Repeat the checks from a fresh solution clone and verify that its reference migration and instructor ADR are present.

Publish participant material only after release approval, to a destination with participant-safe refs and objects. The reference bundle is instructor material. Use the same verified bundle revisions when creating release refs.
