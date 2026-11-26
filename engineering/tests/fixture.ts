import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDir = dirname(fileURLToPath(import.meta.url));

export async function withFixture(script: string, verify: (repo: string) => Promise<void>) {
  const repo = await mkdtemp(join(tmpdir(), "workshop-engineering-"));
  try {
    const tools = join(repo, "engineering");
    await mkdir(tools);
    for (const file of [script, "runtime.ts"]) {
      await copyFile(join(fixtureDir, "..", file), join(tools, file));
    }
    await Bun.write(join(repo, ".gitignore"), "artifacts/\n");
    await verify(repo);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}

export function git(repo: string, ...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd: repo, timeout: 5_000 });
  assert.equal(result.exitCode, 0, result.stderr.toString());
  return result.stdout.toString().trim();
}

export function commitFixture(repo: string) {
  git(repo, "init", "-q");
  git(repo, "add", ".");
  git(repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Fixture");
}

export function run(repo: string, script: string, ...args: string[]) {
  return Bun.spawnSync([process.execPath, join(repo, "engineering", script), ...args], { cwd: repo, timeout: 10_000 });
}
