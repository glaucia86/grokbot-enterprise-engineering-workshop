# VS-02 recovered candidate

The earlier VS-02 change was reconstructed from the merge tree of [VS-01](https://github.com/glaucia86/grokbot-enterprise-engineering-workshop/pull/4) and the retained implementation history. The reconstructed commit is `40755b28b6e14b8bb7d95c618428549e0ce4c02b`, tree `4548dd386d7e4d43425b05d62b84e42002c18b20`. The historical local candidate has a different tree.

## Work restored

- Equivalent normalized submissions replay the existing request and its current lifecycle status. A conflicting payload or requester returns the same scoped 409.
- Eligible approvers can approve or reject a pending request. Rejection requires a reason. The decision and its terminal audit event commit atomically.
- The tests cover authorization, self-decision rejection, competing terminal decisions, rollback of creation and decisions, and both browser decision journeys.

## Evidence

A clean checkout passed `npm ci`, `npm run build` and all six commands in `python3 engineering/check-slice.py VS-02 recovered`. The new candidate passed 37 tests with PostgreSQL 18.7 and Chromium. The decision input tests initially failed on the restored VS-01 base before implementing the validation. [Sanitized evidence](evidence/VS-02-recovered.json)

The quality review checked the scope of persistence queries, conditional writes, audit atomicity and public DTOs. Docker Compose was unavailable in Work. Windows and independent CI are pending. Use this reconstructed candidate as the local VS-03 foundation and route the combined deliverable through human review.
