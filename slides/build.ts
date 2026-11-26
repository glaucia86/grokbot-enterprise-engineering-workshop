import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { root } from "../engineering/runtime";

const presenter = process.argv.includes("--presenter");
const edition = presenter ? "slides-presenter" : "slides";
const output = join(root, "artifacts", edition);
const reveal = "node_modules/reveal.js";
const assets = {
  "deck.css": "slides/deck.css",
  "reset.css": reveal + "/dist/reset.css",
  "reveal.css": reveal + "/dist/reveal.css",
  "reveal-license.txt": reveal + "/LICENSE",
  "assets/procurement-hub.webp": "docs/media/procurement-hub.webp",
  "assets/glaucia-lemos.jpg": "docs/media/glaucia-lemos.jpg",
  "assets/architecture.svg": "slides/assets/architecture.svg",
  "assets/concurrency.svg": "slides/assets/concurrency.svg",
  "assets/verification-loop.svg": "slides/assets/verification-loop.svg",
  "assets/grok.svg": "slides/assets/grok.svg",
  "assets/engineering-lead.svg": "slides/assets/engineering-lead.svg",
  "assets/fde-typescript.svg": "slides/assets/fde-typescript.svg",
  "assets/qa-bot.svg": "slides/assets/qa-bot.svg",
  "assets/devops.svg": "slides/assets/devops.svg",
  "assets/bloub-license.txt": "slides/assets/bloub-license.txt",
  "assets/credits.txt": "slides/assets/credits.txt",
};

async function renderDeck() {
  const source = await Bun.file(join(root, "slides/index.html")).text();
  const marker = /<!-- speaker:([\w-]+) -->/g;
  if (!presenter) return source.replace(marker, "");

  const guide = await Bun.file(join(root, "slides/presenter-guide.md")).text();
  const sections = guide.split(/^<!-- slide:([\w-]+) -->\r?$/m);
  const notes = new Map<string, string>();
  for (let index = 1; index < sections.length; index += 2) {
    const id = sections[index];
    const [heading, english, portuguese, cue] = sections[index + 1].split(/^\*\*(?:EN|PT-BR|Palco)\*\*\r?$/m);
    if (!heading.trim() || !english?.trim() || !portuguese?.trim() || !cue?.trim() || notes.has(id)) {
      throw new Error("Invalid bilingual notes for " + id);
    }
    notes.set(id, [
      '<aside class="notes">',
      '<div lang="en"><strong>EN</strong>' + Bun.markdown.html(english) + '</div>',
      '<div lang="pt-BR"><strong>PT-BR</strong>' + Bun.markdown.html(portuguese) + '</div>',
      '<div lang="pt-BR"><strong>Palco</strong>' + Bun.markdown.html(heading + cue) + '</div>',
      '</aside>',
    ].join("\n"));
  }
  const page = source.replace(marker, (_match, id: string) => {
    const slideNotes = notes.get(id);
    if (!slideNotes) throw new Error("Missing or repeated notes for " + id);
    notes.delete(id);
    return slideNotes;
  });
  if (notes.size) throw new Error("Unmatched notes: " + [...notes.keys()].join(", "));
  return page.replace("<body>", '<body data-presenter>');
}

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
  await Bun.write(join(output, "index.html"), await renderDeck());
  for (const [destination, source] of Object.entries(assets)) {
    await copyFile(join(root, source), join(output, destination));
  }
} catch (error) {
  await rm(output, { recursive: true, force: true });
  throw error;
}

console.log("Built the workshop deck under artifacts/" + edition + "/.");
