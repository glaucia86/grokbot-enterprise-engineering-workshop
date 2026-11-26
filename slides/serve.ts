import { join } from "node:path";
import { root } from "../engineering/runtime";

const directory = join(root, "artifacts/slides");
const paths = new Map([
  ["/workshop/", join(directory, "index.html")],
  ...Array.from(new Bun.Glob("**/*").scanSync({ cwd: directory }), (file) =>
    ["/workshop/" + file.replaceAll("\\", "/"), join(directory, file)] as const),
]);

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4173,
  fetch(request) {
    const path = paths.get(new URL(request.url).pathname);
    return path ? new Response(Bun.file(path)) : new Response("Not found", { status: 404 });
  },
});

console.log("Workshop slides at " + new URL("workshop/", server.url));
