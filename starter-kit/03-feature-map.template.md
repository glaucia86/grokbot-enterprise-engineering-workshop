# Feature Map: <Feature Name>

## User-Facing Behavior
<2–3 sentences describing what the user accomplishes and what changes visibly.>

## Sub-features
- <Sub-feature 1>
- <Sub-feature 2>

## Entry Points
- **UI:** `<route path & panel/form name>`
- **API:** `<HTTP method + route + required headers>`

## Preconditions
- `<doctor check passes>`
- `<required seeded role, tenant, or fixture state>`

## How to Get to It (User POV)
1. <Exact navigation step 1>
2. <Exact interaction step 2>
3. <Visible confirmation>

## Driving It with the Harness
- **Stable selectors:** `<ARIA roles, labels, data-* attributes — avoid brittle CSS classes or coordinates>`
- **Verification commands:**

```bash
<exact command 1>
<exact command 2>
```

## Relevant Domain Rules & Related Invariants
- `INV-XX`: <Business rule enforced across API and database>

## Expected Observable Outcomes & Required Evidence
- **HTTP / UI:** `<expected status codes, error codes, visible UI state>`
- **Persisted State:** `<exact DB table row counts / balances confirming side effects>`

## Gotchas & Known Limitations
- <Known edge cases, seed prerequisites, or explicit out-of-scope boundaries>
