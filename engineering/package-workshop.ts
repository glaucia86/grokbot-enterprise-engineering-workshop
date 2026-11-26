import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { git, root, runIdPattern, writeManifest } from "./runtime";

type Edition = "starter" | "solution";
const sharedFiles = new Set([
  ".env.example", ".gitattributes", ".gitignore", ".github/pull_request_template.md",
  "bun.lock", "compose.yaml", "drizzle.config.ts", "eslint.config.ts", "package.json",
  "playwright.config.ts", "tsconfig.json", "doc-specs/03-demo-issue-42.md",
  "drizzle/0000_tenant_scoped_procurement.sql", "drizzle/meta/0000_snapshot.json", "drizzle/meta/_journal.json",
  "engineering/check-slice.ts", "engineering/runtime.ts", "engineering/slice-checks.json", "engineering/verify-lab.ts",
  "engineering/tests/fixture.ts", "engineering/tests/check-slice.test.ts", "engineering/tests/verify-lab.test.ts",
  "fixtures/ph42-duplicate-snapshot.json",
]);
const solutionFiles = new Set([
  "doc-specs/adr/0001-idempotency-reference-solution.md", "drizzle/0001_ensure_tenant_idempotency.sql",
  "drizzle/meta/0001_snapshot.json", "tests/integration/idempotency-migration.test.ts",
]);

function invokeGit(cwd: string, args: string[], input?: Uint8Array, env?: NodeJS.ProcessEnv) {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdin: input, env, timeout: 20_000 });
  if (result.exitCode !== 0) throw new Error("git " + args[0] + " failed: " + result.stderr.toString().trim());
  return result.stdout;
}

function exportPaths(edition: Edition, revision: string) {
  return invokeGit(root, ["ls-tree", "-r", "-z", revision]).toString().split("\0").filter(Boolean).flatMap((row) => {
    const [entry, path] = row.split("\t", 2);
    if (solutionFiles.has(path)) return edition === "solution" ? [path] : [];
    const allowed = sharedFiles.has(path)
      || /^(src|scripts|tests|skills\/verify-procurement)\/[\w./\[\]-]+\.(ts|tsx|sql|css|md)$/.test(path);
    if (!allowed) return [];
    if (!/^100644 blob [a-f0-9]{40}$/.test(entry)) throw new Error("Unexpected type for release file " + path);
    return [path];
  });
}

async function jsonFile(path: string, update: (document: Record<string, unknown>) => void) {
  const document = await Bun.file(path).json();
  update(document);
  await Bun.write(path, JSON.stringify(document, null, 2) + "\n");
}

async function trimStarter(directory: string, revision: string) {
  invokeGit(directory, ["apply", "--whitespace=error", "-"], invokeGit(root, ["show", revision + ":release/starter.patch"]));
  await jsonFile(join(directory, "package.json"), (document) => {
    delete (document.scripts as Record<string, string>)["test:migration"];
  });
  await jsonFile(join(directory, "drizzle/meta/_journal.json"), (document) => {
    document.entries = (document.entries as unknown[]).slice(0, 1);
  });
  const guide = join(directory, "skills/verify-procurement/SKILL.md");
  const overview = await Bun.file(guide).text();
  await Bun.write(guide, overview.replace(/^If the checkout includes the reference migration suite,.*\n\n/m, ""));
}

async function packageEdition(edition: Edition, output: string, revision: string, date: string) {
  const branch = "workshop/" + edition;
  const directory = await mkdtemp(join(tmpdir(), "procurement-release-"));
  try {
    invokeGit(directory, ["init", "--quiet", "--initial-branch=" + branch]);
    const files = exportPaths(edition, revision);
    if (!files.includes("package.json") || !files.includes("src/app/page.tsx")) throw new Error("Missing workshop runtime files.");
    for (const path of files) {
      const destination = join(directory, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, invokeGit(root, ["show", revision + ":" + path]));
    }
    await Bun.write(join(directory, "README.md"), invokeGit(root, ["show", revision + ":release/" + edition + ".md"]));
    await jsonFile(join(directory, "package.json"), (document) => {
      const scripts = document.scripts as Record<string, string>;
      for (const script of Object.keys(scripts)) {
        if (script === "verify:formal" || script.startsWith("slides:")) delete scripts[script];
      }
    });
    await jsonFile(join(directory, "tsconfig.json"), (document) => {
      document.include = (document.include as string[]).filter((path) => path !== "slides/**/*.ts");
    });
    await jsonFile(join(directory, "engineering/slice-checks.json"), (document) => {
      delete document.PREP;
      if (edition === "starter") delete document["VS-05"];
    });
    if (edition === "starter") await trimStarter(directory, revision);
    invokeGit(directory, ["add", "--all"]);
    invokeGit(directory, [
      "-c", "user.name=Procurement Hub Workshop", "-c", "user.email=workshop@example.invalid",
      "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Procurement Hub workshop " + edition,
    ], undefined, { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
    const reference = "refs/heads/" + branch;
    const commit = invokeGit(directory, ["rev-parse", reference]).toString().trim();
    const history = invokeGit(directory, ["rev-list", "--count", reference]).toString().trim();
    if (history !== "1") throw new Error("Release checkout must contain one isolated root commit.");
    const bundle = join(output, edition + ".bundle");
    invokeGit(directory, ["bundle", "create", bundle, reference]);
    invokeGit(directory, ["bundle", "verify", bundle]);
    return { branch, commit, file: basename(bundle), files: files.length + 1 };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const [runId, ...extra] = Bun.argv.slice(2);
if (!runId || !runIdPattern.test(runId) || extra.length || git("status", "--porcelain")) {
  throw new Error("Use a clean checkout and provide one lowercase release run ID.");
}
const source = git("rev-parse", "HEAD");
const date = git("show", "-s", "--format=%cI", source);
const releaseRoot = join(root, "artifacts/release");
const output = join(releaseRoot, runId);
await mkdir(releaseRoot, { recursive: true });
await mkdir(output);
try {
  const starter = await packageEdition("starter", output, source, date);
  const solution = await packageEdition("solution", output, source, date);
  await writeManifest(join(output, "manifest.json"), { source, starter, solution, publication: "pending-review" });
  console.log("Prepared verified Git bundles under artifacts/release/" + runId + ".");
} catch (error) {
  await rm(output, { recursive: true, force: true });
  throw error;
}
