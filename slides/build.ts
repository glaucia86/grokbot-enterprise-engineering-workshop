import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { root } from "../engineering/runtime";

const output = join(root, "artifacts/slides");
const reveal = "node_modules/reveal.js";
const assets = {
  "index.html": "slides/index.html",
  "deck.css": "slides/deck.css",
  "reset.css": reveal + "/dist/reset.css",
  "reveal.css": reveal + "/dist/reveal.css",
  "reveal-license.txt": reveal + "/LICENSE",
  "assets/procurement-hub.webp": "docs/media/procurement-hub.webp",
  "assets/glaucia-lemos.jpg": "docs/media/glaucia-lemos.jpg",
};

await rm(output, { recursive: true, force: true });
try {
  await mkdir(join(output, "assets"), { recursive: true });
  const bundle = await Bun.build({
    entrypoints: [join(root, "slides/deck.ts")],
    target: "browser",
    format: "esm",
    outdir: output,
    minify: true,
  });
  if (!bundle.success) throw new AggregateError(bundle.logs, "Reveal.js build failed.");
  for (const [destination, source] of Object.entries(assets)) {
    await copyFile(join(root, source), join(output, destination));
  }
} catch (error) {
  await rm(output, { recursive: true, force: true });
  throw error;
}

console.log("Built the workshop deck under artifacts/slides/.");
