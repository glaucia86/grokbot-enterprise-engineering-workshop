# Online workshop delivery

| Experience | Host | Status |
| --- | --- | --- |
| Reveal.js walkthrough with speaker notes | GitHub Pages, using the static output of **Workshop slides** | Publication awaits deck approval and Pages settings. Each pull request build makes a downloadable preview. |
| Live Procurement Hub with purchase submission, decisions and audit | Vercel for Next.js and a dedicated PostgreSQL instance | Hosted profile and deployment pending. The current reference app runs on loopback. |

## Publish the reviewed slide deck

1. Review `slides/` and the **workshop-slides** artifact in the pull request’s **Workshop slides** run. Neither application source nor private authoring documents are packaged. Both languages of speaker notes are part of the published artifact.
2. After the change is merged and publication is approved, check whether the private repository’s plan supports Pages. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. Confirm the intended site visibility in repository or organization settings. A Pages site can be publicly accessible even when its source repository is private. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
3. Run **Actions → Workshop slides → Run workflow** on `main`. The workflow builds and checks the exact selected commit, then deploys the tested artifact through the `github-pages` environment. Add the URL reported by the deployment to the workshop README after opening it. [Deploying a custom Pages artifact](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

If Pages is unavailable on this private repository, the same reviewed artifact can be built in a separate participant-facing repository. The ZIP and local preview already support rehearsals.

## Prepare an interactive preview on Vercel

Procurement Hub renders pages on the server, handles requests through Next.js route handlers and persists purchases and audit events in PostgreSQL. Pages serves the static slides. Vercel can host the app and use the Bun runtime for Next.js Functions. A hosted configuration can select the `1.4.x` channel with `bunVersion` in `vercel.json`. Vercel selects the patch on deploy, while the workshop and CI pin Bun 1.4.5. [Bun runtime on Vercel](https://vercel.com/docs/functions/runtimes/bun)

The existing `WORKSHOP_LAB_MODE` profile has a loopback-only database URL and the session route checks the local request origin. Setting a hosted `DATABASE_URL` or importing the repository in Vercel will leave the interactive workflow unavailable. Keep those local guarantees and prepare a dedicated hosted profile.

1. Use a dedicated preview project with access protection and a disposable PostgreSQL instance seeded exclusively with workshop data. Use preview-scoped credentials and configure the pooled connection for request handling. Apply tracked migrations and seed once from a controlled setup step. [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) · [PostgreSQL on Vercel](https://vercel.com/docs/postgres)
2. Enable synthetic roles only in the protected demo. Verify the request origin against the approved preview origin and keep the server responsible for assigning role, actor and tenant. Preserve the local profile for the downloadable workshop.
3. Before sharing the preview, rehearse submission, approval, rejection and audit from the hosted HTTPS URL. Check idempotent retries against PostgreSQL, cross-tenant access denial and how participants will reset their session or workspace.

A protected preview is the first delivery target. For a public interactive demo, define how visitors get isolated synthetic workspaces and how write volume and resets are bounded. Add a live link after the selected deployment passes the hosted walkthrough.
