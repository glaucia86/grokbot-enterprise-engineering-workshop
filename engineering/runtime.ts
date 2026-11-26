import { lstat, open, rename } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const verificationDir = resolve(root, "artifacts/verification");
export const bun = process.execPath;
export const runIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function git(...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd: root, timeout: 15_000 });
  if (result.exitCode !== 0) throw new Error("Git could not identify the checkout.");
  return result.stdout.toString().trim();
}

export function relativePath(path: string) {
  return relative(root, path).replaceAll("\\", "/");
}

export async function fileInfo(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function writeManifest(path: string, manifest: unknown) {
  const pending = path + ".tmp";
  await Bun.write(pending, JSON.stringify(manifest, null, 2) + "\n");
  await rename(pending, path);
}

export async function spawnLogged(
  command: string[],
  output: string,
  options: { env?: Record<string, string | undefined>; signal?: AbortSignal; timeout?: number } = {},
) {
  const log = await open(output, "w");
  try {
    return Bun.spawn(command, {
      cwd: root,
      stdin: "ignore",
      stdout: log.fd,
      stderr: log.fd,
      ...options,
      killSignal: "SIGKILL",
    });
  } finally {
    await log.close();
  }
}

export async function lastJson(log: string): Promise<Record<string, unknown>> {
  const line = (await Bun.file(log).text()).split("\n").findLast((entry) => entry.startsWith("{"));
  if (line === undefined) throw new Error("The command log contains no JSON evidence.");
  return JSON.parse(line);
}

export function elapsedSeconds(start: number) {
  return Math.round(performance.now() - start) / 1_000;
}
