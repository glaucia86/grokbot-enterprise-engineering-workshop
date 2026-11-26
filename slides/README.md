# Workshop slides

Twelve Reveal.js slides take you from an observed duplicate purchase to a pull request with verifiable evidence. The deck includes commands for the Procurement Hub lab and speaker notes in English and Brazilian Portuguese.

## View the deck

- **Local preview.** With Bun 1.4.5 and the checkout available, run the commands below and open the [local deck at 127.0.0.1:4173/workshop/](http://127.0.0.1:4173/workshop/).
- **Download.** Open the pull request’s **Workshop slides** check and download the `workshop-slides` artifact. Unzip it and serve the directory over HTTP. The slide assets ship together and can be served offline.
- **GitHub Pages.** Publish the reviewed build from `main` using the [online delivery guide](../doc-specs/08-online-workshop.md).

```bash
bun install --frozen-lockfile
bun run slides:preview
```

Use the arrow keys or on-screen controls to move through the deck. Press **S** to open the presenter window. The **Procurement Hub** link in the deck targets the [running local lab](../README.md#run-the-lab).

## Edit and verify

Update the slide content and bilingual notes in [index.html](index.html). Use [deck.css](deck.css) for layout and [deck.ts](deck.ts) for Reveal.js configuration.

```bash
bun run browser:install
bun run slides:verify
```

The build copies the presentation and its explicit assets to `artifacts/slides/`. The browser checks serve it under a subpath like a GitHub project site. The Pages workflow deploys that static output only. Reveal.js is distributed with its MIT license in the artifact.
