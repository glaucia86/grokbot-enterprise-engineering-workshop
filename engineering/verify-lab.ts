import { access, mkdir, mkdtemp, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { bun, elapsedSeconds, fileInfo, git, lastJson, relativePath, root, runIdPattern, spawnLogged, verificationDir, writeManifest } from "./runtime";

const next = "node_modules/next/dist/bin/next";
const stageIds = ["launch", "doctor", "drive", "evidence", "cleanup"] as const;
type StageId = typeof stageIds[number];
type StageStatus = "pass" | "fail" | "blocked" | "not-run";
type Command = { command: string[]; expectedExitCode: number; exitCode: number | null; artifactPath: string };
type Stage = {
  id: StageId;
  status: StageStatus;
  commands: Command[];
  startedAt?: string;
  finishedAt?: string;
  durationSeconds?: number;
  detail?: string;
};
type CheckEntry = {
  id: string;
  criteria: string[];
  command: string[];
  status: string;
  exitCode: number | null;
  durationSeconds: number;
  artifactPaths: string[];
};
type Report = {
  schemaVersion: 2;
  slice: string;
  runId: string;
  environment: "isolated-lab";
  runtime: string;
  loopbackPorts: { application: number; postgresql: number };
  startedAt: string;
  candidateSha: string;
  candidateTree: string;
  worktreeDirty: boolean;
  humanReview: "pending";
  toolVersions: { bun: string; git: string; postgres?: string };
  stages: Stage[];
  composeProject?: string;
  doctor?: Record<string, unknown>;
  browserResults?: string;
  checkManifest?: string;
  checks?: CheckEntry[];
  observations?: Record<string, Record<string, unknown>>;
  limitations: string[];
  status?: StageStatus;
  finishedAt?: string;
};

class LabError extends Error {
  constructor(message: string, readonly status: "blocked" | "fail" = "blocked") {
    super(message);
  }
}

function randomHex(size: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(size)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function reservePorts() {
  const listen = () => Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const app = listen();
  try {
    const database = listen();
    try {
      return { application: app.port, postgresql: database.port };
    } finally {
      database.stop(true);
    }
  } finally {
    app.stop(true);
  }
}

async function waitForListener(child: Bun.Subprocess, port: number, seconds: number, signal: AbortSignal) {
  const deadline = performance.now() + seconds * 1_000;
  while (performance.now() < deadline && !signal.aborted) {
    if (child.exitCode !== null || child.signalCode !== null) throw new LabError("Owned process exited before opening its loopback port.");
    try {
      const connection = await Bun.connect({ hostname: "127.0.0.1", port, socket: { data() {} } });
      connection.end();
      return;
    } catch {
      await Bun.sleep(150);
    }
  }
  throw new LabError(signal.aborted ? "Run interrupted." : "Timed out waiting for the owned loopback port.");
}

async function stopProcess(child: Bun.Subprocess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const exited = await Promise.race([
      child.exited.then(() => true),
      new Promise<boolean>((done) => { timer = setTimeout(() => done(false), 10_000); }),
    ]);
    if (!exited) {
      child.kill("SIGKILL");
      await child.exited;
    }
  } finally {
    clearTimeout(timer);
  }
}

async function executable(directory: string, name: string) {
  const path = resolve(directory, name + (process.platform === "win32" ? ".exe" : ""));
  try {
    await access(path, 1);
  } catch {
    throw new LabError("Standalone PostgreSQL executable is unavailable: " + name + ".");
  }
  return path;
}

function renderSummary(report: Report): string {
  const stageRows = report.stages
    .map((s) => `| \`${s.id}\` | **${s.status}** | ${s.durationSeconds ?? 0}s | ${s.detail ?? "—"} |`)
    .join("\n");
  const checkRows = (report.checks ?? []).length
    ? (report.checks ?? [])
        .map(
          (c) =>
            `| \`${c.id}\` | ${c.criteria.join(", ") || "—"} | **${c.status}** | ${c.exitCode ?? "null"} | ${c.durationSeconds}s | \`${c.artifactPaths[0] ?? ""}\` |`,
        )
        .join("\n")
    : "| — | — | not-run | — | — | — |";

  const ph42 = report.observations?.ph42Approval as
    | {
        status?: string;
        httpStatuses?: number[];
        violatedInvariants?: string[];
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
      }
    | undefined;

  const ph42Block = ph42
    ? [
        `- **Status:** \`${ph42.status ?? "unknown"}\``,
        `- **HTTP statuses:** \`${JSON.stringify(ph42.httpStatuses ?? [])}\``,
        `- **Violated invariants:** \`${JSON.stringify(ph42.violatedInvariants ?? [])}\``,
        `- **Before DB snapshot:** \`${JSON.stringify(ph42.before ?? {})}\``,
        `- **After DB snapshot:** \`${JSON.stringify(ph42.after ?? {})}\``,
      ].join("\n")
    : "- Not captured in this run.";

  return [
    `# Verification Evidence Summary — ${report.slice} (${report.runId})`,
    "",
    `- **Overall verdict:** **${report.status ?? "unknown"}**`,
    `- **Candidate Git SHA:** \`${report.candidateSha}\``,
    `- **Candidate Tree SHA:** \`${report.candidateTree}\``,
    `- **Worktree dirty:** \`${report.worktreeDirty}\``,
    `- **Environment:** \`${report.environment}\` (${report.runtime})`,
    `- **Tool versions:** Bun \`${report.toolVersions.bun}\`, PostgreSQL \`${report.toolVersions.postgres ?? "unknown"}\`, \`${report.toolVersions.git}\``,
    `- **Started / Finished:** ${report.startedAt} -> ${report.finishedAt ?? ""}`,
    `- **Human review:** \`${report.humanReview}\``,
    "",
    "## Lifecycle Stages",
    "",
    "| Stage | Status | Duration | Detail |",
    "| --- | --- | --- | --- |",
    stageRows,
    "",
    "## Executed Checks",
    "",
    "| Check ID | Criteria | Status | Exit Code | Duration | Log |",
    "| --- | --- | --- | --- | --- | --- |",
    checkRows,
    "",
    "## PH-42 Live Concurrent Approval Observation ($7,000 + $7,000 vs $10,000)",
    "",
    ph42Block,
    "",
    "## Artifacts Retained After Cleanup",
    "",
    `- Machine-readable manifest: \`${relativePath(join(dirname(report.checkManifest ? join(root, report.checkManifest) : join(verificationDir, report.slice, report.runId, "attempt-0/manifest.json")), "..", "manifest.json"))}\``,
    `- Lifecycle manifest: \`artifacts/verification/${report.slice}/${report.runId}/lifecycle/manifest.json\``,
    ...(report.checkManifest ? [`- Check manifest: \`${report.checkManifest}\``] : []),
    ...(report.browserResults ? [`- Browser results / traces: \`${report.browserResults}\``] : []),
    "",
    "## Known Limitations",
    "",
    ...report.limitations.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

class LabRun {
  readonly report: Report;
  readonly resources: (() => Promise<void>)[] = [];
  readonly ports = reservePorts();
  readonly password = randomHex(20);
  readonly env: Record<string, string | undefined>;
  activeStage: Stage;

  constructor(
    readonly slice: string,
    readonly runId: string,
    readonly path: string,
    readonly postgresBin: string | undefined,
    readonly signal: AbortSignal,
  ) {
    this.env = {
      ...process.env,
      WORKSHOP_DB_PORT: String(this.ports.postgresql),
      WORKSHOP_DB_PASSWORD: this.password,
      WORKSHOP_DATABASE_URL: "postgresql://procurement:" + this.password + "@127.0.0.1:" + this.ports.postgresql + "/procurement_hub_lab",
      WORKSHOP_LAB_MODE: "enabled",
      WORKSHOP_BASE_URL: "http://127.0.0.1:" + this.ports.application,
      WORKSHOP_PLAYWRIGHT_OUTPUT_DIR: join(dirname(path), "browser-results"),
      NEXT_TELEMETRY_DISABLED: "1",
    };
    const stages: Stage[] = stageIds.map((id) => ({ id, status: "not-run", commands: [] }));
    this.activeStage = stages[0];
    this.report = {
      schemaVersion: 2,
      slice,
      runId,
      environment: "isolated-lab",
      runtime: postgresBin ? "standalone-postgres" : "docker-compose",
      loopbackPorts: this.ports,
      startedAt: new Date().toISOString(),
      candidateSha: git("rev-parse", "HEAD"),
      candidateTree: git("rev-parse", "HEAD^{tree}"),
      worktreeDirty: Boolean(git("status", "--porcelain")),
      toolVersions: { bun: Bun.version, git: git("--version") },
      humanReview: "pending",
      stages,
      limitations: [
        "Isolated loopback synthetic lab environment; not a production load or multi-region test.",
        "Formal TLA+/TLC model checking runs via `bun run verify:formal` and produces a separate bounded-model manifest.",
        "Local verification is not a substitute for independent GitHub Actions CI or human PR review.",
      ],
    };
  }

  async command(command: string[], name: string, seconds: number, expected = 0, status: "blocked" | "fail" = "blocked") {
    const output = join(this.path, name + ".log");
    const entry: Command = { command, expectedExitCode: expected, exitCode: null, artifactPath: relativePath(output) };
    this.activeStage.commands.push(entry);
    const signal = this.activeStage.id === "cleanup" ? undefined : this.signal;
    const child = await spawnLogged(command, output, { env: this.env, timeout: seconds * 1_000, signal });
    entry.exitCode = await child.exited;
    if (signal?.aborted) throw new LabError("Run interrupted.");
    if (entry.exitCode !== expected) throw new LabError(name + " exited " + entry.exitCode + ".", status);
    return output;
  }

  async stage(id: StageId, action: () => Promise<void>) {
    const stage = this.report.stages[stageIds.indexOf(id)];
    this.activeStage = stage;
    stage.startedAt = new Date().toISOString();
    const start = performance.now();
    try {
      if (id !== "cleanup" && this.signal.aborted) throw new LabError("Run interrupted.");
      await action();
      stage.status = "pass";
    } catch (error) {
      stage.status = error instanceof LabError ? error.status : "blocked";
      stage.detail = error instanceof LabError ? error.message : id + " could not finish. See lifecycle logs.";
    } finally {
      stage.finishedAt = new Date().toISOString();
      stage.durationSeconds = elapsedSeconds(start);
    }
    return stage.status === "pass";
  }

  async ownProcess(command: string[], name: string, port: number, seconds: number) {
    const child = await spawnLogged(command, join(this.path, name + ".log"), { env: this.env });
    this.resources.push(() => stopProcess(child));
    await waitForListener(child, port, seconds, this.signal);
  }

  async startStandalone(initdb: string, postgres: string) {
    const workspace = await mkdtemp(join(tmpdir(), "procurement-workshop-"));
    this.resources.push(() => rm(workspace, { recursive: true, force: true }));
    const cluster = join(workspace, "data");
    const passwordFile = join(workspace, "password");
    await Bun.write(passwordFile, this.password + "\n");
    try {
      await this.command([
        initdb, "-D", cluster, "--username=procurement", "--auth-local=reject", "--auth-host=scram-sha-256",
        "--pwfile", passwordFile, "--no-locale", "--encoding=UTF8",
      ], "postgres-init", 45);
    } finally {
      await rm(passwordFile, { force: true });
    }
    await this.ownProcess([
      postgres, "-D", cluster, "-h", "127.0.0.1", "-p", String(this.ports.postgresql), "-c", "unix_socket_directories=",
    ], "postgres", this.ports.postgresql, 20);
    await this.command([bun, "scripts/create-lab-database.ts"], "postgres-create-db", 15);
  }

  async startCompose(docker: string) {
    const localHost = /^(unix|npipe):\/\//;
    const context = await this.command([
      docker, "context", "inspect", "--format", "{{.Endpoints.docker.Host}}",
    ], "docker-context", 10);
    const host = this.env.DOCKER_HOST;
    if (!localHost.test((await Bun.file(context).text()).trim()) || (host && !localHost.test(host))) {
      throw new LabError("Select a local Docker context before running the lab.");
    }
    const project = "procurement-workshop-" + randomHex(8);
    this.report.composeProject = project;
    const compose = [docker, "compose", "-p", project, "-f", join(root, "compose.yaml")];
    this.resources.push(async () => { await this.command([...compose, "down", "--volumes", "--timeout", "10"], "compose-down", 40); });
    await this.command([...compose, "up", "--wait", "--wait-timeout", "60", "db"], "compose-up", 90);
  }

  async launch() {
    const pgTools = this.postgresBin
      ? [await executable(this.postgresBin, "initdb"), await executable(this.postgresBin, "postgres")] as const
      : undefined;
    const docker = pgTools ? undefined : Bun.which("docker");
    if (!pgTools && !docker) throw new LabError("Docker is unavailable. Supply --postgres-bin for standalone PostgreSQL.");
    if (!(await Bun.file(join(root, next)).exists())) throw new LabError("Workshop dependencies are missing. Run bun install first.");

    const lock = join(verificationDir, ".active");
    try {
      await mkdir(lock);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      throw new LabError("The checkout already has a lab run in progress.");
    }
    this.resources.push(() => rmdir(lock));
    await this.command([bun, "--bun", next, "build"], "build", 180);
    if (pgTools) await this.startStandalone(...pgTools);
    else if (docker) await this.startCompose(docker);
    await this.command([bun, "scripts/init-lab.ts"], "lab-init", 45);
    await this.ownProcess([
      bun, "--bun", next, "start", "--hostname", "127.0.0.1", "--port", String(this.ports.application),
    ], "app", this.ports.application, 40);
  }

  async doctor() {
    this.report.doctor = {};
    for (const [mode, options] of [["database", ["--db-only"]], ["application", []]] as const) {
      const output = await this.command([bun, "scripts/lab-doctor.ts", ...options], "doctor-" + mode, 20);
      const parsed = await lastJson(output);
      this.report.doctor[mode] = parsed;
      const db = parsed.database as { postgresVersion?: string } | undefined;
      if (db?.postgresVersion) this.report.toolVersions.postgres = db.postgresVersion;
    }
  }

  async capture() {
    const run = dirname(this.path);
    const browser = join(run, "browser-results");
    if ((await fileInfo(browser))?.isDirectory()) this.report.browserResults = relativePath(browser);
    const attempt = join(run, "attempt-0");
    const manifest = Bun.file(join(attempt, "manifest.json"));
    if (!(await manifest.exists())) throw new LabError("The check runner did not produce a manifest.");
    const checks: { candidateSha: string; worktreeDirty: boolean; checks: CheckEntry[] } = await manifest.json();
    if (checks.candidateSha !== this.report.candidateSha) throw new LabError("The revision changed between launch and verification.", "fail");
    this.report.checkManifest = relativePath(join(attempt, "manifest.json"));
    this.report.checks = checks.checks;
    this.report.worktreeDirty ||= checks.worktreeDirty;

    const submissionLog = join(attempt, "submission-concurrency.log");
    const observations: Record<string, Record<string, unknown>> = {};
    if (await Bun.file(submissionLog).exists()) {
      observations.submissionConcurrency = await lastJson(submissionLog);
    }

    const expectFailure = this.slice === "starter" || this.slice === "VS-04";
    const ph42Log = await this.command(
      [bun, "scripts/reproduce-ph42.ts", "--isolated"],
      "ph42-observation",
      35,
      expectFailure ? 1 : 0,
      "fail",
    );
    const ph42Text = await Bun.file(ph42Log).text();
    const jsonStart = ph42Text.indexOf("{");
    if (jsonStart >= 0) {
      observations.ph42Approval = JSON.parse(ph42Text.slice(jsonStart)) as Record<string, unknown>;
    }
    this.report.observations = observations;
  }

  async cleanup() {
    let failure: unknown;
    while (this.resources.length) {
      const release = this.resources.pop();
      try {
        await release?.();
      } catch (error) {
        failure ??= error;
      }
    }
    if (failure) throw failure;
  }

  async run() {
    try {
      if (await this.stage("launch", () => this.launch()) && await this.stage("doctor", () => this.doctor())) {
        await this.stage("drive", async () => {
          await this.command([bun, "engineering/check-slice.ts", this.slice, this.runId], "drive", 600, 0, "fail");
        });
        await this.stage("evidence", () => this.capture());
      }
    } finally {
      await this.stage("cleanup", () => this.cleanup());
    }
    this.report.worktreeDirty ||= Boolean(git("status", "--porcelain")) || git("rev-parse", "HEAD") !== this.report.candidateSha;
    const states = this.report.stages.map(({ status }) => status);
    this.report.status = states.includes("blocked")
      ? "blocked"
      : states.every((status) => status === "pass") && !this.report.worktreeDirty
        ? "pass"
        : "fail";
    this.report.finishedAt = new Date().toISOString();

    const runRoot = dirname(this.path);
    const lifecycleOutput = join(this.path, "manifest.json");
    const rootManifest = join(runRoot, "manifest.json");
    const summaryPath = join(runRoot, "summary.md");
    await writeManifest(lifecycleOutput, this.report);
    await writeManifest(rootManifest, this.report);
    await Bun.write(summaryPath, renderSummary(this.report));
    console.log(this.report.status + ": " + relativePath(rootManifest));
    console.log("summary: " + relativePath(summaryPath));
    return { pass: 0, fail: 1, blocked: 2 }[this.report.status];
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      slice: { type: "string" },
      "run-id": { type: "string" },
      "postgres-bin": { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log("Usage: bun engineering/verify-lab.ts [--slice starter|solution|VS-04|VS-05] [--run-id <id>] [--postgres-bin <bin-dir>]");
    return 0;
  }
  const slice = values.slice ?? "solution";
  const runId = values["run-id"] ?? new Date().toISOString().slice(0, 19).toLowerCase().replaceAll(":", "") + "-" + randomHex(4);
  if (!["starter", "solution", "VS-04", "VS-05"].includes(slice) || !runIdPattern.test(runId)) {
    throw new Error("Expected starter, solution, VS-04 or VS-05 and a run ID containing lowercase letters, digits or hyphens.");
  }
  const sliceDirectory = join(verificationDir, slice);
  const run = join(sliceDirectory, runId);
  await mkdir(sliceDirectory, { recursive: true });
  try {
    await mkdir(run);
  } catch {
    throw new Error("Could not create a new run in the current Git checkout.");
  }
  const path = join(run, "lifecycle");
  await mkdir(path);
  const interrupted = new AbortController();
  const interrupt = () => interrupted.abort();
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    return await new LabRun(slice, runId, path, values["postgres-bin"], interrupted.signal).run();
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The verification run could not finish.");
  process.exitCode = 2;
}
