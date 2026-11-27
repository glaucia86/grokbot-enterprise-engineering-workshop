import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";
import { git, root, runIdPattern, writeManifest } from "./runtime";

type Edition = "starter" | "guided" | "solution";

const starterBaselineSha = "53779711493e9c36a7a26adaf47d0163e6beb2cf";

const starterOverlayFromBaseline = [
  "src/server/db/lab-sync-barrier.ts",
  "src/server/db/schema.ts",
  "src/modules/procurement/infrastructure/postgres-requests.ts",
  "src/app/api/purchase-requests/[id]/decision/route.ts",
  "drizzle/meta/_journal.json",
  "tests/integration/procurement.test.ts",
];

const solutionOnlyPaths = new Set([
  "drizzle/0003_approval_integrity_constraints.sql",
  "docs/adr/0003-concurrent-approval-locking-and-budget-constraints.md",
  "docs/adr/0004-approval-idempotency-scope-and-fingerprinting.md",
  "doc-specs/adr/0001-idempotency-reference-solution.md",
  "docs/workshop/FACILITATOR-GUIDE.md",
  "tests/integration/approval-migration.test.ts",
]);

const authoringOnly = [/^release\//, /^\.agents\//, /^\.scratch\//];

const excludedFromParticipant = [
  ...authoringOnly,
  /^slides\//,
  /^docs\/assessment\//,
  /^doc-specs\/handoffs\//,
  /^doc-specs\/adr\//,
];

function invokeGit(cwd: string, args: string[], input?: Uint8Array, env?: NodeJS.ProcessEnv) {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdin: input, env, timeout: 30_000 });
  if (result.exitCode !== 0) throw new Error("git " + args[0] + " failed: " + result.stderr.toString().trim());
  return result.stdout;
}

function listTrackedFiles(revision: string): string[] {
  return invokeGit(root, ["ls-tree", "-r", "-z", revision])
    .toString()
    .split("\0")
    .filter(Boolean)
    .map((row) => {
      const [entry, path] = row.split("\t", 2);
      if (!/^100644 blob [a-f0-9]{40}$/.test(entry)) {
        throw new Error("Unexpected Git object type for " + path);
      }
      return path;
    });
}

function selectPaths(edition: Edition, revision: string): string[] {
  const all = listTrackedFiles(revision);
  return all.filter((path) => {
    if (path === "README.md") return false; // replaced by edition-specific README
    if (edition !== "solution" && solutionOnlyPaths.has(path)) return false;
    if (edition !== "solution" && excludedFromParticipant.some((pattern) => pattern.test(path))) return false;
    if (edition === "solution" && authoringOnly.some((pattern) => pattern.test(path))) return false;
    return true;
  });
}

async function jsonFile(path: string, update: (document: Record<string, unknown>) => void) {
  const document = (await Bun.file(path).json()) as Record<string, unknown>;
  update(document);
  await Bun.write(path, JSON.stringify(document, null, 2) + "\n");
}

async function applyStarterOverlay(directory: string) {
  for (const path of starterOverlayFromBaseline) {
    const content = invokeGit(root, ["show", `${starterBaselineSha}:${path}`]);
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  await jsonFile(join(directory, "package.json"), (doc) => {
    const scripts = doc.scripts as Record<string, string>;
    for (const key of Object.keys(scripts)) {
      if (key.startsWith("slides:")) delete scripts[key];
    }
    scripts["test:migration"] = "bun --bun vitest run tests/integration/idempotency-migration.test.ts";
  });
  await jsonFile(join(directory, "tsconfig.json"), (doc) => {
    doc.include = (doc.include as string[]).filter((p) => p !== "slides/**/*.ts");
  });
}

async function verifyNoStarterSpoilers(directory: string) {
  for (const forbidden of [
    "drizzle/0003_approval_integrity_constraints.sql",
    "docs/adr/0003-concurrent-approval-locking-and-budget-constraints.md",
    "docs/adr/0004-approval-idempotency-scope-and-fingerprinting.md",
    "docs/workshop/FACILITATOR-GUIDE.md",
    "tests/integration/approval-migration.test.ts",
  ]) {
    if (await Bun.file(join(directory, forbidden)).exists()) {
      throw new Error("Spoiler leak detected in participant edition: " + forbidden);
    }
  }
  const repoImpl = await Bun.file(join(directory, "src/modules/procurement/infrastructure/postgres-requests.ts")).text();
  if (repoImpl.includes('.for("update")') || repoImpl.includes("decisionIdempotencyKeys")) {
    throw new Error("Starter postgres-requests.ts unexpectedly contains solution locking or idempotency code.");
  }
}

async function packageEdition(edition: Edition, output: string, revision: string, date: string) {
  const branch = "workshop/" + edition;
  const directory = await mkdtemp(join(tmpdir(), `procurement-release-${edition}-`));
  try {
    invokeGit(directory, ["init", "--quiet", "--initial-branch=" + branch]);
    const files = selectPaths(edition, revision);
    for (const path of files) {
      const destination = join(directory, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, invokeGit(root, ["show", `${revision}:${path}`]));
    }
    await writeFile(join(directory, "README.md"), invokeGit(root, ["show", `${revision}:release/${edition}.md`]));

    if (edition === "starter" || edition === "guided") {
      await applyStarterOverlay(directory);
      if (edition === "guided") {
        await writeFile(
          join(directory, "GUIDED-WORKSHEET.md"),
          invokeGit(root, ["show", `${revision}:release/GUIDED-WORKSHEET.md`]),
        );
      }
      await verifyNoStarterSpoilers(directory);
    }

    invokeGit(directory, ["add", "--all"]);
    invokeGit(
      directory,
      [
        "-c", "user.name=Procurement Hub Workshop",
        "-c", "user.email=workshop@example.invalid",
        "-c", "commit.gpgsign=false",
        "commit", "--quiet", "-m", `Procurement Hub workshop ${edition} edition`,
      ],
      undefined,
      { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    );

    const reference = "refs/heads/" + branch;
    const commit = invokeGit(directory, ["rev-parse", reference]).toString().trim();
    const history = invokeGit(directory, ["rev-list", "--count", reference]).toString().trim();
    if (history !== "1") throw new Error(`Edition ${edition} must have one isolated root commit.`);

    const bundle = join(output, edition + ".bundle");
    invokeGit(directory, ["bundle", "create", bundle, reference]);
    invokeGit(directory, ["bundle", "verify", bundle]);
    return { branch, commit, file: basename(bundle), bundlePath: bundle, files: files.length + 1 };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: { "create-local-refs": { type: "boolean", default: false } },
  allowPositionals: true,
});

const [runId, ...extra] = positionals;
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
  const guided = await packageEdition("guided", output, source, date);
  const solution = await packageEdition("solution", output, source, date);

  if (values["create-local-refs"]) {
    for (const item of [starter, guided, solution]) {
      invokeGit(root, ["fetch", item.bundlePath, `+${item.branch}:${item.branch}`]);
    }
  }

  await writeManifest(join(output, "manifest.json"), {
    source,
    starter: { branch: starter.branch, commit: starter.commit, file: starter.file, files: starter.files },
    guided: { branch: guided.branch, commit: guided.commit, file: guided.file, files: guided.files },
    solution: { branch: solution.branch, commit: solution.commit, file: solution.file, files: solution.files },
    localBranchesCreated: Boolean(values["create-local-refs"]),
    publication: "pending-human-review",
  });
  console.log(`Prepared verified Git bundles under artifacts/release/${runId}.`);
} catch (error) {
  await rm(output, { recursive: true, force: true });
  throw error;
}
