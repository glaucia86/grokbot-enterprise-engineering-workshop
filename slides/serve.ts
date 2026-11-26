import { join } from "node:path";
import { root } from "../engineering/runtime";

const paths = new Map<string, string>();
function mount(prefix: string, edition: string) {
  const directory = join(root, "artifacts", edition);
  paths.set(prefix, join(directory, "index.html"));
  for (const file of new Bun.Glob("**/*").scanSync({ cwd: directory })) {
    paths.set(prefix + file.replaceAll("\\", "/"), join(directory, file));
  }
}

mount("/workshop/", "slides");
if (process.argv.includes("--presenter")) mount("/presenter/", "slides-presenter");

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.WORKSHOP_SLIDES_PORT ?? 4173),
  fetch(request) {
    const path = paths.get(new URL(request.url).pathname);
    return path ? new Response(Bun.file(path)) : new Response("Not found", { status: 404 });
  },
});

console.log("Workshop slides at " + new URL("workshop/", server.url));
if (paths.has("/presenter/")) console.log("Presenter edition at " + new URL("presenter/", server.url));
