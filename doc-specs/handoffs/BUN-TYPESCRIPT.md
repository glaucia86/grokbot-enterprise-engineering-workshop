# Workshop handoff — TypeScript on Bun

| Field | Value |
| --- | --- |
| Objective | Run the application, tests, and repository tooling in TypeScript with Bun. |
| Branch | `chore/bun-typescript-workshop` |
| GitHub base | `75a4ed60f40639f50448ad59b40895ed35726298`, including VS-05. |
| Verified code | `15fe0ec6b10412645fd3314ce5f8d6d06941cbf6`, tree `a89ab1fc1ab6579024684abd8826dc927b1b294a`. |
| Review | Local verification passed. Independent CI and human review are pending. |

## Run the workshop

```bash
bun install --frozen-lockfile
bun run browser:install
bun run verify:all --slice VS-05 --run-id workshop-bun
```

Use Bun 1.4.5. For standalone PostgreSQL, add `--postgres-bin <bin-dir>`. The [workshop setup](../../README.md#run-the-lab) covers the interactive lab. The application still uses Next.js and Playwright still drives Chromium. Bun supplies the compatibility APIs those tools and the test helpers use. SQL migrations, stylesheets, and structured configuration keep their native formats.

## Observed verification

| Check | Result |
| --- | --- |
| Clean checkout | Frozen installation and Next.js build passed with Bun, with Node.js and npm absent from the execution PATH. |
| VS-05 | Ten gates and 48 tests passed, including three PostgreSQL migration scenarios and four Chromium journeys. |
| PH-42 | The live calls returned 200 and 201 for one request and one creation event. The synthetic snapshot reported its expected failing observation with two requests and two events. |
| VS-04 entry point | The default harness invocation passed against the same executable code. |
| Teardown on failure | A deliberately missing Chromium binary failed the browser check. Both ports closed, the temporary cluster was removed, and the manifests and logs remained available. |
| Skill bootstrap | A pinned manifest downloaded and passed digest verification. The engineering tests also checked that a modified file is rejected. |

See the [sanitized evidence](evidence/BUN-TYPESCRIPT.json) for exact revisions and command results. The rehearsal used Linux, standalone PostgreSQL 18.7 and a compatible Chromium binary. Docker Compose, Windows, independent CI, and the native GrokBot runtime remain unverified. The browser installer was exercised with `--dry-run`.

## Review and resume

The review checked that installation, build, lint, type checking and subprocesses all invoke Bun. Application cryptography uses Web Crypto and retains the SHA-256 digest and session token formats. The harness tests cover retry bounds, immutable run IDs and preserved evidence. The scope includes the tooling migration and the existing VS-05 behavior. VS-06 still owns independent CI and participant packaging.
