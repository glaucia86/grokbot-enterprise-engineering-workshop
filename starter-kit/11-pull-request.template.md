# 11 — Evidence-Based Enterprise Pull Request Template

## 1. Business Context
## 2. Root Cause
## 3. Proposed Solution
## 4. Architectural Implications
## 5. Requirements & Business Invariants (`INV-*`)
## 6. Verification Evidence (Exact Commit SHA + Status Table + Artifact Paths)
## 7. Security Implications (Isolation, Authorization on Replay, Log Hygiene)
## 8. Migration & Compatibility Considerations
## 9. Rollback or Forward-Recovery Strategy
## 10. Known Limitations & Unverified Claims
## 11. Human Approval Checklist (Reviewer Only)
- [ ] Candidate SHA matches independent CI run.
- [ ] Protected verifier/policy edits audited explicitly.
- [ ] Real database/runtime evidence inspected independently.
- [ ] Approved for merge by authorized human reviewer (never self-merged by agent).
