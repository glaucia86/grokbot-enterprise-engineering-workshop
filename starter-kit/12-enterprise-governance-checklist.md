# 12 — Enterprise Governance Checklist

Distinguish **repository-committed files** from **platform administrative controls**:

## Repository Controls (Committed in Git)
- [ ] Least-privilege workflow permissions (`permissions: contents: read`).
- [ ] Third-party GitHub Actions pinned to immutable full commit SHAs.
- [ ] Separate independent CI jobs for static/architecture, unit/property, integration/concurrency/security, E2E/evidence, and formal verification.
- [ ] `governance-guard` step surfaces edits to acceptance specs, lint boundaries, tests, or CI workflows.
- [ ] Evidence manifests bind exact commit SHA, reject `worktreeDirty: true`, and sanitize cookies/secrets/PII.

## Administrative Platform Controls (Configured by Org / Repo Admins)
- [ ] Branch protection ruleset on `main`: require PR, >=1 human approval, dismiss stale reviews on push.
- [ ] `CODEOWNERS` required review on `.github/workflows/`, `eslint.config.*`, `PRD.md`, `tests/security/`, and migrations.
- [ ] Strict required status checks matching every CI gate job name.
- [ ] Force-push and branch deletion disabled; admin bypass audited or disabled.
- [ ] AI coding agent tokens scoped strictly to non-protected feature branches with zero production credentials or merge rights.
