import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { git, root, runIdPattern, writeManifest } from "./runtime";

const tlcSha256 = "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88";
const seed = 4207;
const modelName = "PH42.tla";
const configs = ["stale-check.cfg", "atomic.cfg"] as const;
type Configuration = typeof configs[number];

function sha256(data: Uint8Array) {
  return new Bun.CryptoHasher("sha256").update(data).digest("hex");
}

async function runTlc(java: string, jar: string, output: string, configuration: Configuration) {
  const stateDir = join(output, configuration + "-states");
  const result = Bun.spawnSync([
    java, "-XX:+UseParallelGC", "-cp", jar, "tlc2.TLC",
    "-workers", "1", "-seed", String(seed), "-metadir", stateDir, "-config", configuration, modelName,
  ], { cwd: output, stdin: "ignore", timeout: 60_000, killSignal: "SIGKILL" });
  const log = result.stdout.toString() + result.stderr.toString();
  const logFile = configuration.replace(".cfg", ".log");
  await Bun.write(join(output, logFile), log);
  await rm(stateDir, { recursive: true, force: true });

  const [, generated, distinct, queued] = log.match(/(\d+) states generated, (\d+) distinct states found, (\d+) states left on queue\./) ?? [];
  const version = log.match(/^TLC2 Version [^\r\n]+/m)?.[0];
  const counterexample = [...log.matchAll(/^State \d+: <([A-Za-z]+)/gm)].map(([, action]) => action);
  const expected = configuration === "stale-check.cfg"
    ? result.exitCode === 12 && log.includes("Invariant UniqueRequest is violated.") && counterexample.length > 1
    : result.exitCode === 0 && log.includes("No error has been found.") && queued === "0";
  return {
    configuration, logFile, version, exitCode: result.exitCode,
    expected: Boolean(expected && version && generated && distinct),
    generatedStates: generated === undefined ? null : Number(generated),
    distinctStates: distinct === undefined ? null : Number(distinct),
    queuedStates: queued === undefined ? null : Number(queued),
    counterexample,
  };
}

async function main() {
  const [jarPath, runId, ...extra] = Bun.argv.slice(2);
  if (!jarPath || !runId || !runIdPattern.test(runId) || extra.length) {
    throw new Error("Usage: bun run verify:formal <tla2tools.jar> <lowercase-run-id>");
  }
  const jar = resolve(jarPath);
  const jarBytes = await Bun.file(jar).bytes();
  if (sha256(jarBytes) !== tlcSha256) throw new Error("Use the documented TLA+ v1.7.4 JAR with its pinned digest.");
  const java = Bun.which("java");
  if (!java) throw new Error("TLC requires Java 11 or later.");

  const candidateSha = git("rev-parse", "HEAD");
  const worktreeDirty = Boolean(git("status", "--porcelain"));
  const directory = join(root, "artifacts/formal");
  const output = join(directory, runId);
  await mkdir(directory, { recursive: true });
  await mkdir(output);

  const digest: Record<string, string> = {};
  for (const name of [modelName, ...configs]) {
    const input = await Bun.file(join(root, "formal", name)).bytes();
    digest[name] = sha256(input);
    await Bun.write(join(output, name), input);
  }

  const results = [];
  for (const configuration of configs) results.push(await runTlc(java, jar, output, configuration));
  const passed = results.every(({ expected }) => expected);
  await writeManifest(join(output, "manifest.json"), {
    schemaVersion: 1, runId, candidateSha, worktreeDirty, evidenceType: "bounded-model",
    seed, workers: 1, tlcSha256, digest, status: passed ? "pass" : "fail", results,
  });
  console.log((passed ? "pass" : "fail") + ": artifacts/formal/" + runId + "/manifest.json");
  return passed ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to verify the model.");
  process.exitCode = 2;
}
