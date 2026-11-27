import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { git, relativePath, root, runIdPattern, writeManifest } from "./runtime";

const tlcVersion = "1.7.4";
const tlcUrl = `https://github.com/tlaplus/tlaplus/releases/download/v${tlcVersion}/tla2tools.jar`;
const tlcSha256 = "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88";
const dockerJreImage = "eclipse-temurin:21-jre-alpine";
const seed = 4207;
const modelName = "ProcurementApproval.tla";
const configs = ["defective-read-commit.cfg", "locked-atomic.cfg"] as const;
type Configuration = typeof configs[number];

function sha256(data: Uint8Array) {
  return new Bun.CryptoHasher("sha256").update(data).digest("hex");
}

async function ensureJar(explicitPath?: string): Promise<string> {
  if (explicitPath) {
    const resolved = resolve(explicitPath);
    const bytes = await Bun.file(resolved).bytes();
    if (sha256(bytes) !== tlcSha256) {
      throw new Error("Supplied JAR digest does not match pinned TLA+ v1.7.4 SHA-256.");
    }
    return resolved;
  }

  const cacheDir = join(root, "artifacts/.cache");
  const cached = join(cacheDir, `tla2tools-${tlcVersion}.jar`);
  if (await Bun.file(cached).exists()) {
    const bytes = await Bun.file(cached).bytes();
    if (sha256(bytes) === tlcSha256) return cached;
  }

  await mkdir(cacheDir, { recursive: true });
  const response = await fetch(tlcUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
    headers: { "User-Agent": "procurement-hub-formal-verifier/1" },
  });
  if (!response.ok) {
    throw new Error(`Unable to download official TLA+ v${tlcVersion} JAR (HTTP ${response.status}). Pass --jar <path> for offline execution.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (sha256(bytes) !== tlcSha256) {
    throw new Error("Downloaded tla2tools.jar failed SHA-256 integrity verification.");
  }
  await Bun.write(cached, bytes);
  return cached;
}

type RunnerMode = { kind: "java"; executable: string } | { kind: "docker"; executable: string; image: string };

function selectRunner(): RunnerMode {
  const java = Bun.which("java");
  if (java) return { kind: "java", executable: java };
  const docker = Bun.which("docker");
  if (docker) return { kind: "docker", executable: docker, image: dockerJreImage };
  throw new Error("Formal verification requires either local Java 11+ or Docker (for pinned eclipse-temurin JRE fallback).");
}

function toDockerMountPath(hostPath: string): string {
  return resolve(hostPath).replaceAll("\\", "/");
}

async function runTlc(runner: RunnerMode, jar: string, output: string, configuration: Configuration) {
  const stateDirName = configuration.replace(".cfg", "") + "-states";
  const stateDirHost = join(output, stateDirName);
  const tlcArgs = [
    "-XX:+UseParallelGC",
    "-cp",
    runner.kind === "docker" ? "/tla/tla2tools.jar" : jar,
    "tlc2.TLC",
    "-deadlock",
    "-workers",
    "1",
    "-seed",
    String(seed),
    "-metadir",
    runner.kind === "docker" ? `/work/${stateDirName}` : stateDirHost,
    "-config",
    configuration,
    modelName,
  ];

  const argv =
    runner.kind === "java"
      ? [runner.executable, ...tlcArgs]
      : [
          runner.executable,
          "run",
          "--rm",
          "-v",
          `${toDockerMountPath(jar)}:/tla/tla2tools.jar:ro`,
          "-v",
          `${toDockerMountPath(output)}:/work`,
          "-w",
          "/work",
          runner.image,
          "java",
          ...tlcArgs,
        ];

  const result = Bun.spawnSync(argv, {
    cwd: output,
    stdin: "ignore",
    timeout: 180_000,
    killSignal: "SIGKILL",
  });
  const log = result.stdout.toString() + result.stderr.toString();
  const logFile = configuration.replace(".cfg", ".log");
  await Bun.write(join(output, logFile), log);
  await rm(stateDirHost, { recursive: true, force: true });

  const [, generated, distinct, queued] =
    log.match(/(\d+) states generated, (\d+) distinct states found, (\d+) states left on queue\./) ?? [];
  const version = log.match(/^TLC2 Version [^\r\n]+/m)?.[0] ?? null;
  const violatedInvariant = log.match(/Invariant ([A-Za-z0-9_]+) is violated\./)?.[1] ?? null;
  const counterexample = [...log.matchAll(/^State \d+: <([A-Za-z0-9_]+)/gm)].map(([, action]) => action);

  const expected =
    configuration === "defective-read-commit.cfg"
      ? result.exitCode === 12 && violatedInvariant === "BudgetNotExceeded" && counterexample.length > 1
      : result.exitCode === 0 && log.includes("No error has been found.") && queued === "0";

  return {
    configuration,
    logFile,
    version,
    exitCode: result.exitCode,
    violatedInvariant,
    expected: Boolean(expected && version && generated && distinct),
    generatedStates: generated === undefined ? null : Number(generated),
    distinctStates: distinct === undefined ? null : Number(distinct),
    queuedStates: queued === undefined ? null : Number(queued),
    counterexample,
  };
}

function renderFormalSummary(manifest: {
  runId: string;
  candidateSha: string;
  worktreeDirty: boolean;
  runner: string;
  status: string;
  results: Awaited<ReturnType<typeof runTlc>>[];
}) {
  const rows = manifest.results
    .map(
      (r) =>
        `| \`${r.configuration}\` | ${r.exitCode} | **${r.expected ? "expected" : "unexpected"}** | ${r.generatedStates ?? "—"} | ${r.distinctStates ?? "—"} | ${r.queuedStates ?? "—"} | ${r.violatedInvariant ?? "None"} |`,
    )
    .join("\n");
  const defective = manifest.results.find((r) => r.configuration === "defective-read-commit.cfg");
  const trace = defective?.counterexample.length
    ? defective.counterexample.map((step, i) => `${i + 1}. \`${step}\``).join("\n")
    : "No counterexample trace captured.";

  return [
    `# Formal Verification Summary — ProcurementApproval.tla (${manifest.runId})`,
    "",
    `- **Verdict:** **${manifest.status}**`,
    `- **Candidate Git SHA:** \`${manifest.candidateSha}\``,
    `- **Worktree dirty:** \`${manifest.worktreeDirty}\``,
    `- **TLC Runner:** \`${manifest.runner}\``,
    `- **Bounds:** \`Allocated = 10\`, \`Amount = 7\`, \`Workers = {w1, w2}\`, \`Requests = {r1, r2}\`, \`Keys = {k1, k2}\`, \`seed = ${seed}\``,
    "",
    "## Model Checking Results",
    "",
    "| Configuration | Exit Code | Outcome | Generated States | Distinct States | Left on Queue | Violated Invariant |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    rows,
    "",
    "## Counterexample Trace (`defective-read-commit.cfg`)",
    "",
    trace,
    "",
    "## Scope Boundary",
    "",
    "- Exhaustive TLC verification applies strictly to `formal/ProcurementApproval.tla` under the stated finite bounds.",
    "- It does not mechanically prove TypeScript code generation, Drizzle SQL execution, or PostgreSQL internals; those are verified by Vitest, concurrency, security, and Playwright runtime suites.",
    "",
  ].join("\n");
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "run-id": { type: "string" },
      jar: { type: "string" },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });
  if (values.help) {
    console.log("Usage: bun run verify:formal [--run-id <lowercase-id>] [--jar <path/to/tla2tools.jar>]");
    return 0;
  }

  const jarArg = values.jar ?? (positionals.length === 2 ? positionals[0] : undefined);
  const runId =
    values["run-id"] ??
    (positionals.length === 2 ? positionals[1] : positionals[0]) ??
    "formal-" + new Date().toISOString().slice(0, 19).toLowerCase().replaceAll(":", "").replaceAll("t", "-");

  if (!runIdPattern.test(runId)) {
    throw new Error("Provide a valid lowercase run ID (letters, digits, hyphens).");
  }

  const runner = selectRunner();
  const jar = await ensureJar(jarArg);
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
  for (const configuration of configs) {
    results.push(await runTlc(runner, jar, output, configuration));
  }
  const passed = results.every(({ expected }) => expected);
  const runnerLabel = runner.kind === "java" ? "native-java" : `docker:${runner.image}`;
  const manifest = {
    schemaVersion: 2,
    runId,
    candidateSha,
    worktreeDirty,
    evidenceType: "bounded-model",
    runner: runnerLabel,
    seed,
    workers: 1,
    tlcSha256,
    bounds: { allocated: 10, amount: 7, workers: 2, requests: 2, keys: 2 },
    digest,
    status: passed ? "pass" : "fail",
    results,
  };
  await writeManifest(join(output, "manifest.json"), manifest);
  await Bun.write(join(output, "summary.md"), renderFormalSummary(manifest));
  console.log(`${manifest.status}: ${relativePath(join(output, "manifest.json"))}`);
  console.log(`summary: ${relativePath(join(output, "summary.md"))}`);
  return passed ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to verify the model.");
  process.exitCode = 2;
}
