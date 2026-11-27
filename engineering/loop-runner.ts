import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { elapsedSeconds, fileInfo, git, relativePath, root, runIdPattern, spawnLogged, writeManifest } from "./runtime";

export const DEFAULT_PROTECTED_PREFIXES = [
  "eslint.config.ts",
  ".github/workflows/",
  "PRD.md",
  "engineering/slice-checks.json",
  "tests/concurrency/",
  "tests/security/",
] as const;

export type LoopIteration = {
  index: number;
  stage: string;
  hypothesis: string;
  command: string;
  fingerprint: string;
  candidateSha: string;
  changedFiles: string[];
  exitCode: number | null;
  status: "pass" | "fail" | "blocked";
  durationSeconds: number;
  startedAt: string;
  finishedAt: string;
  logPath: string;
};

export type LoopState = {
  schemaVersion: 1;
  runId: string;
  issue: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "completed" | "escalated";
  escalationReason?: string;
  budgets: {
    maxIterations: number;
    maxConsecutiveFailures: number;
    timeBudgetSeconds: number;
    protectedPaths: string[];
  };
  consecutiveFailures: number;
  iterations: LoopIteration[];
};

function sha256(text: string): string {
  return new Bun.CryptoHasher("sha256").update(text).digest("hex");
}

function loopDir(runId: string): string {
  return join(root, "artifacts/loop", runId);
}

function changedFiles(): string[] {
  const modified = git("diff", "--name-only", "HEAD");
  const untracked = git("ls-files", "--others", "--exclude-standard");
  const merged = new Set<string>();
  for (const block of [modified, untracked]) {
    for (const line of block.split(/\r?\n/)) {
      const trimmed = line.trim().replaceAll("\\", "/");
      if (trimmed) merged.add(trimmed);
    }
  }
  return [...merged].sort();
}

function currentDiffHash(): string {
  const head = git("rev-parse", "HEAD");
  const diff = git("diff", "HEAD");
  const untracked = git("ls-files", "--others", "--exclude-standard");
  return sha256([head, diff, untracked].join("\n---\n"));
}

function protectedViolations(files: string[], protectedPaths: string[]): string[] {
  return files.filter((file) =>
    protectedPaths.some((prefix) =>
      prefix.endsWith("/") ? file.startsWith(prefix) : file === prefix,
    ),
  );
}

function renderHandoff(state: LoopState): string {
  const latest = state.iterations.at(-1);
  const files = latest?.changedFiles.length ? latest.changedFiles.map((f) => `- \`${f}\``).join("\n") : "- None";
  const rows = state.iterations.length
    ? state.iterations
        .map(
          (it) =>
            `| ${it.index} | ${it.stage} | ${it.hypothesis.replaceAll("|", "\\|")} | \`${it.command.replaceAll("|", "\\|")}\` | ${it.exitCode ?? "null"} | ${it.status} | \`${it.logPath}\` |`,
        )
        .join("\n")
    : "| — | — | No iterations executed yet | — | — | — | — |";

  const nextStep =
    state.status === "escalated"
      ? `**Human escalation required:** ${state.escalationReason ?? "Budget or scope guard tripped."}`
      : state.status === "completed"
        ? "All loop verification criteria passed. Open/update Pull Request with evidence for human review."
        : "Formulate next falsifiable hypothesis, apply minimal targeted change, and execute next bounded check.";

  return [
    `# Loop Engineering Handoff — ${state.issue} (${state.runId})`,
    "",
    `- **Status:** \`${state.status}\``,
    `- **Candidate SHA:** \`${latest?.candidateSha ?? git("rev-parse", "HEAD")}\``,
    `- **Iterations used:** ${state.iterations.length} / ${state.budgets.maxIterations}`,
    `- **Consecutive failures:** ${state.consecutiveFailures} / ${state.budgets.maxConsecutiveFailures}`,
    `- **Time budget:** ${state.budgets.timeBudgetSeconds}s (started ${state.createdAt})`,
    ...(state.escalationReason ? [`- **Escalation reason:** ${state.escalationReason}`] : []),
    "",
    "## Iteration Ledger",
    "",
    "| # | Stage | Hypothesis | Command | Exit | Status | Log |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    rows,
    "",
    "## Changed Files Observed",
    "",
    files,
    "",
    "## Next Executable Step",
    "",
    nextStep,
    "",
  ].join("\n");
}

async function saveState(state: LoopState): Promise<void> {
  const dir = loopDir(state.runId);
  await mkdir(dir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  await writeManifest(join(dir, "state.json"), state);
  await Bun.write(join(dir, "handoff.md"), renderHandoff(state));
}

async function loadState(runId: string): Promise<LoopState> {
  const statePath = join(loopDir(runId), "state.json");
  const file = Bun.file(statePath);
  if (!(await file.exists())) {
    throw new Error(`Loop run "${runId}" does not exist. Initialize it first with: bun engineering/loop-runner.ts init --run-id ${runId} --issue PH-42`);
  }
  return (await file.json()) as LoopState;
}

function parseShellWords(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  for (const ch of command.trim()) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (quote) throw new Error("Unclosed quote in --cmd argument.");
  if (current) tokens.push(current);
  if (!tokens.length) throw new Error("--cmd must not be empty.");
  return tokens;
}

async function cmdInit(args: string[]): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      "run-id": { type: "string" },
      issue: { type: "string", default: "PH-42" },
      "max-iterations": { type: "string", default: "3" },
      "max-consecutive-failures": { type: "string", default: "2" },
      "time-budget-seconds": { type: "string", default: "900" },
    },
  });
  const runId = values["run-id"];
  if (!runId || !runIdPattern.test(runId)) {
    throw new Error("Provide a valid lowercase --run-id (letters, digits, hyphens).");
  }
  if (await fileInfo(join(loopDir(runId), "state.json"))) {
    throw new Error(`Loop run "${runId}" already exists. Use a fresh run ID or inspect status.`);
  }
  const now = new Date().toISOString();
  const state: LoopState = {
    schemaVersion: 1,
    runId,
    issue: values.issue ?? "PH-42",
    createdAt: now,
    updatedAt: now,
    status: "active",
    budgets: {
      maxIterations: Math.max(1, Number(values["max-iterations"]) || 3),
      maxConsecutiveFailures: Math.max(1, Number(values["max-consecutive-failures"]) || 2),
      timeBudgetSeconds: Math.max(10, Number(values["time-budget-seconds"]) || 900),
      protectedPaths: [...DEFAULT_PROTECTED_PREFIXES],
    },
    consecutiveFailures: 0,
    iterations: [],
  };
  await saveState(state);
  console.log(JSON.stringify({ status: "initialized", runId, statePath: relativePath(join(loopDir(runId), "state.json")) }));
  return 0;
}

async function cmdRun(args: string[]): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      "run-id": { type: "string" },
      stage: { type: "string", default: "verify" },
      hypothesis: { type: "string" },
      cmd: { type: "string" },
      "allow-protected": { type: "boolean", default: false },
      complete: { type: "boolean", default: false },
    },
  });
  const runId = values["run-id"];
  const hypothesis = values.hypothesis?.trim();
  const cmd = values.cmd?.trim();
  if (!runId || !runIdPattern.test(runId) || !hypothesis || !cmd) {
    throw new Error("Usage: loop-runner.ts run --run-id <id> --stage <stage> --hypothesis <text> --cmd <command>");
  }

  const state = await loadState(runId);
  if (state.status !== "active") {
    throw new Error(`Loop "${runId}" is already ${state.status}: ${state.escalationReason ?? "closed"}.`);
  }

  const elapsed = (Date.now() - new Date(state.createdAt).getTime()) / 1000;
  if (elapsed > state.budgets.timeBudgetSeconds) {
    state.status = "escalated";
    state.escalationReason = `Execution time budget exceeded (${Math.round(elapsed)}s > ${state.budgets.timeBudgetSeconds}s).`;
    await saveState(state);
    throw new Error(state.escalationReason);
  }

  if (state.iterations.length >= state.budgets.maxIterations) {
    state.status = "escalated";
    state.escalationReason = `Iteration budget exhausted (${state.iterations.length}/${state.budgets.maxIterations}).`;
    await saveState(state);
    throw new Error(state.escalationReason);
  }

  const files = changedFiles();
  const violations = protectedViolations(files, state.budgets.protectedPaths);
  if (violations.length > 0 && !values["allow-protected"]) {
    state.status = "escalated";
    state.escalationReason = `Scope-expansion guard tripped: protected files modified (${violations.join(", ")}). Explicit human approval required.`;
    await saveState(state);
    throw new Error(state.escalationReason);
  }

  const diffHash = currentDiffHash();
  const fingerprint = sha256([cmd, hypothesis.toLowerCase(), diffHash].join("|"));
  const repeatedFail = state.iterations.find((it) => it.status !== "pass" && it.fingerprint === fingerprint);
  if (repeatedFail) {
    throw new Error(
      `Anti-spin guard: refusing to re-run identical failing command "${cmd}" with unchanged hypothesis and code diff (matches iteration #${repeatedFail.index}). Formulate a new hypothesis or change code first.`,
    );
  }

  const index = state.iterations.length + 1;
  const logFile = join(loopDir(runId), `iteration-${index}.log`);
  const argv = parseShellWords(cmd);
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let exitCode: number | null = null;
  let status: LoopIteration["status"] = "blocked";

  try {
    const child = await spawnLogged(argv, logFile, { timeout: 180_000 });
    exitCode = await child.exited;
    status = exitCode === 0 ? "pass" : "fail";
  } catch {
    await Bun.write(logFile, `Unable to spawn command: ${cmd}\n`);
  }

  const iteration: LoopIteration = {
    index,
    stage: values.stage ?? "verify",
    hypothesis,
    command: cmd,
    fingerprint,
    candidateSha: git("rev-parse", "HEAD"),
    changedFiles: files,
    exitCode,
    status,
    durationSeconds: elapsedSeconds(start),
    startedAt,
    finishedAt: new Date().toISOString(),
    logPath: relativePath(logFile),
  };

  state.iterations.push(iteration);
  if (status === "pass") {
    state.consecutiveFailures = 0;
    if (values.complete) state.status = "completed";
  } else {
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= state.budgets.maxConsecutiveFailures) {
      state.status = "escalated";
      state.escalationReason = `Consecutive failure budget exhausted (${state.consecutiveFailures}/${state.budgets.maxConsecutiveFailures}). Attack the premise or escalate to a human reviewer.`;
    } else if (state.iterations.length >= state.budgets.maxIterations) {
      state.status = "escalated";
      state.escalationReason = `Iteration budget reached after failing iteration #${index}.`;
    }
  }

  await saveState(state);
  console.log(JSON.stringify({
    runId: state.runId,
    loopStatus: state.status,
    iteration,
    escalationReason: state.escalationReason ?? null,
    handoffPath: relativePath(join(loopDir(runId), "handoff.md")),
  }, null, 2));

  return status === "pass" ? 0 : 1;
}

async function cmdStatus(args: string[]): Promise<number> {
  const { values } = parseArgs({
    args,
    options: { "run-id": { type: "string" } },
  });
  const runId = values["run-id"];
  if (!runId || !runIdPattern.test(runId)) {
    throw new Error("Usage: loop-runner.ts status --run-id <id>");
  }
  const state = await loadState(runId);
  console.log(JSON.stringify({
    runId: state.runId,
    issue: state.issue,
    status: state.status,
    iterations: state.iterations.length,
    maxIterations: state.budgets.maxIterations,
    consecutiveFailures: state.consecutiveFailures,
    maxConsecutiveFailures: state.budgets.maxConsecutiveFailures,
    escalationReason: state.escalationReason ?? null,
    handoffPath: relativePath(join(loopDir(runId), "handoff.md")),
  }, null, 2));
  return 0;
}

async function main(): Promise<number> {
  const [subcommand, ...rest] = Bun.argv.slice(2);
  if (subcommand === "init") return cmdInit(rest);
  if (subcommand === "run") return cmdRun(rest);
  if (subcommand === "status") return cmdStatus(rest);
  console.log("Usage: bun engineering/loop-runner.ts <init|run|status> [options]");
  return 2;
}

if (import.meta.main) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Loop runner error.");
    process.exitCode = 2;
  }
}
