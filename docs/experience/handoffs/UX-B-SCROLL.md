# Variant B: scroll-led purchase story

## Selected direction and scope

The owner selected **Variant B** and requested a home experience inspired by the product sequence at [Decade](https://decade.com/): a persistent device view, financial values revealed in context, and transitions tied to the visitor's scroll.

This slice evolves `/home` on `prototype/ux-variants`. It keeps B's navy, petroleum, mint, IBM Plex typography, existing entry points, and role selection. The primary home route already defaults to B. The working application and the other comparison variants retain their existing contracts.

Design reading: an institutional financial product home with a more expressive narrative. Design variance 6, motion intensity 7 within the story, visual density 4. This is a targeted evolution of the approved B design, using the existing native CSS and React foundation. The reference informs the interaction pattern; no Decade copy, assets, or source code is incorporated.

## Observable experience

The previous click-only ledger is now a four-chapter story:

| Chapter | What the visitor sees | Financial meaning in the example |
| --- | --- | --- |
| Submit request | The purchase enters a mobile review layout | $7,000 requested, $0 committed, $10,000 available |
| Review impact | A floating projected balance appears | $3,000 available **if approved**; the actual illustrative commitment is still $0 |
| Record approval | The budget allocation and request status change | $7,000 committed and $3,000 available in the intended successful outcome |
| Trace the outcome | The request and approval records appear together | Two illustrative audit events; no additional commitment |

All amounts originate in one presentation-only fixture, use integer minor units, and are formatted with `formatUsd`. The hero uses that same fixture. None of these values comes from a tenant's records, and the story performs no session or financial mutation.

## Interaction and accessibility contract

- On supported desktop viewports (at least 1024 CSS px wide and 700 px high), the device remains visible beside the chapters. Native CSS timelines move the device and value panels; `IntersectionObserver` selects a discrete chapter.
- Ordinary forward and backward scrolling works. There are no wheel cancellations, custom scroll containers, continuous React scroll state, or new animation dependencies.
- Four native buttons provide direct chapter selection. A **Skip walkthrough** link reaches the financial controls section.
- Direct chapter fragments are restored once after the progressively enhanced layout and fonts settle. That restoration is canceled on unmount and does not override an explicit chapter selection or a changed fragment.
- On narrow or short screens, unsupported timeline implementations, or reduced motion, the preview sits in normal document flow. All four chapters remain readable, with manual preview controls when JavaScript is available.
- Without JavaScript, the server-rendered narrative and example remain available; nonfunctional preview buttons are hidden.
- Moving copies of the figures are hidden from assistive technology. The preview has a non-live state/amount description, and only explicit button selections announce a change.
- Reduced motion removes the story animations and transitions entirely. The sticky track is conditional on motion being allowed.

This implements the home-specific intent of **TC-03, TC-04, TC-07, XR-13, XR-14, XR-15, XR-18, and XR-19**. It does not constitute evidence that any financial invariant, edition, or production deployment is verified.

## Files and responsibilities

- `src/app/_prototype/financial-story-data.ts`: illustrative purchase and chapter content.
- `src/app/_prototype/financial-story.tsx`: progressive enhancement, accessible controls, and the device illustration.
- `src/app/_prototype/financial-story.css`: scoped composition, motion, and responsive fallbacks.
- `src/app/_prototype/home-b.prototype.tsx`: home integration and shared illustration values.
- `src/app/_prototype/experience-b.css`: removes styles belonging to the replaced click-only ledger.
- `tests/e2e/experience/home-b-motion.spec.ts`: read-only browser checks for scrolling, keyboard use, reduced motion, narrow/short screens, no JavaScript, chapter boundaries, and fragment restoration.

## Reproducing verification

Use the repository-pinned Bun and dependencies and an initialized, isolated local workshop database. Set `WORKSHOP_PROTOTYPES=enabled` for **both** the app process and the Playwright process. Production previews require this explicit opt-in; the normal working-application verification must retain its existing prototype gate.

```sh
bun run check:static
bun run verify:architecture
bun run test:unit
bun run build
# In the app process, with WORKSHOP_PROTOTYPES=enabled and the normal lab environment:
bun run start
# In a second process with the same prototype flag and WORKSHOP_BASE_URL:
bun run test:e2e tests/e2e/experience/home-b-motion.spec.ts --project=experience --no-deps
```

The motion spec explicitly skips when the prototype flag is absent, matching the app's opt-in contract. Its assertions are not a replacement for the legacy working-UI journeys. Browser errors and API writes are checked during the illustrative interactions.

Final evidence must name the exact candidate SHA, clean worktree status, browser/runtime versions, executed checks, and any blocked or unrun release gates. Performance measurements are local lab observations, not field Core Web Vitals. Review phone clipping, value-panel overlap, and the fixed comparison dock in screenshots at 1440x900, 1280x720, 1024x700, 390x844, and 320x720.
