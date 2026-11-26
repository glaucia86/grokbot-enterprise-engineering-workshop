# Workshop skill inventory

The [lockfile](../engineering/skills-lock.json) records all 24 selected skills, with purpose, phase, upstream, pinned revision, license, install path, audit status and exact file digests. Install from the repository root with `bun engineering/bootstrap-skills.ts`. Verify an existing installation offline with `bun engineering/bootstrap-skills.ts --verify`. The installer preserves existing packages and reports any mismatch. Use a fresh checkout for an isolated reinstall.

The audit compared source files with pinned Git objects and the hosted Uizze package with its publisher checksums. It inspected skill manifests, attribution and license information, supporting files, script dependencies and I/O. Upstream executable helpers were reviewed as source. They were not run as part of the bootstrap. The project's authorization still governs every external action suggested by the imported material. Configure participant packaging separately and review redistribution terms for each included skill.

## Source and usage notes

- `to-prd` is pinned to the upstream revision that still contains it. Use the drafting and test-seam guidance in `to-prd` and `to-spec` for the existing PRD and specification. `to-tickets` informs the linked ticket index. These documents remain in the private repository review flow.
- `clean-code` and `code-review-and-quality` are required before each code slice handoff. `handoff` applies with the repository's persisted template. Use `implement-spec` for scoped implementation guidance under the workshop's one-slice review gate.
- Drizzle guidance is LobeHub-specific. It is a local upstream copy under the LobeHub Community License. The web-design-guidelines package is installed from Vercel's listing and locally pinned, with separate redistribution terms unconfirmed at its selected revision. Both packages stay outside release packaging unless their terms are cleared.
- The Playwright skill's CLI is a separate executable. The Docker helper requires Compose v2, and design helpers add their own prerequisites. The project can run its workshop scripts independently of those helpers.
- Codex skill discovery and skill execution are separate capabilities. The [preparation handoff](handoffs/PREP.md) records which phases were exercised.
