# Workshop slides

Seventeen Reveal.js slides follow PH-42 from a synthetic historical snapshot to a verified candidate and a human pull request review. Lauren Tan's inverted pyramid connects the four pillars to the Procurement Hub lab.

## View the deck

- **Local preview.** With Bun 1.4.5 and the checkout available, run the commands below and open the [local deck at 127.0.0.1:4173/workshop/](http://127.0.0.1:4173/workshop/).
- **Download.** Open the pull request’s **Workshop slides** check and download the `workshop-slides` artifact. Unzip it and serve the directory over HTTP. The audience deck can be served offline.
- **GitHub Pages.** Publish the reviewed build from `main` using the [online delivery guide](../doc-specs/08-online-workshop.md).
- **Presenter edition.** Read the [private bilingual guide](presenter-guide.md) in GitHub. Use `bun run slides:preview:presenter` for the [local presenter edition](http://127.0.0.1:4173/presenter/) and press **S** for Reveal's notes window.

```bash
bun install --frozen-lockfile
bun run slides:preview
```

Use the arrow keys or on-screen controls to move through the deck. The **Procurement Hub** link targets the [running local lab](../README.md#run-the-lab) on the viewer's device.

## Edit and verify

Edit the audience slides in [index.html](index.html) and the bilingual talk track in [presenter-guide.md](presenter-guide.md). Keep their slide identifiers in sync. The [diagrams](diagrams/) contain the editable Excalidraw scenes. Update the corresponding SVG under [assets](assets/) when changing a scene.

```bash
bun run browser:install
bun run slides:verify
```

The audience build writes its static allowlist to `artifacts/slides/`. The presenter build writes to `artifacts/slides-presenter/`. The browser checks exercise both editions under project subpaths and keep local captures under `test-results/slides/`. Set `WORKSHOP_SLIDES_PORT` if the default port is occupied. Pages publishes only the audience directory.
