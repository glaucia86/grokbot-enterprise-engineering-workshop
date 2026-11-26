import { chmod, mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileInfo, root } from "./runtime";

type SkillFile = [path: string, url: string, digest: string, executable: boolean];
type Skill = { name: string; path: string; files: SkillFile[] };
const origins = new Set(["raw.githubusercontent.com", "uizze.sh"]);
const maxBytes = 8_388_608;
const skillsRoot = join(root, ".agents/skills");

function packagePath(value: string) {
  if (value.includes("\\") || value.includes(":") || value.split("/").some((part) => !part || part === ".." || part === ".")) {
    throw new Error("Invalid package path: " + value);
  }
  return value;
}

function checkDigest(data: Uint8Array, expected: string, path: string) {
  if (new Bun.CryptoHasher("sha256").update(data).digest("hex") !== expected) {
    throw new Error("digest mismatch: " + path);
  }
}

async function listFiles(directory: string, packageRoot: string = directory): Promise<string[]> {
  if ((await fileInfo(directory))?.isSymbolicLink()) throw new Error("Unexpected symbolic link in " + directory);
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Unexpected symbolic link in " + directory);
    if (entry.isDirectory()) files.push(...await listFiles(path, packageRoot));
    else if (entry.isFile()) files.push(relative(packageRoot, path).replaceAll("\\", "/"));
    else throw new Error("Unexpected filesystem entry in " + directory);
  }
  return files;
}

async function verify(directory: string, files: SkillFile[]) {
  const expected = new Set(files.map(([path]) => packagePath(path)));
  const actual = await listFiles(directory);
  if (actual.length !== expected.size || !expected.has("SKILL.md") || actual.some((path) => !expected.has(path))) {
    throw new Error("File list differs from lock in " + directory);
  }
  for (const [path, , digest] of files) {
    checkDigest(new Uint8Array(await Bun.file(join(directory, path)).arrayBuffer()), digest, path);
  }
}

async function approvedDownload(initial: string) {
  let url = new URL(initial);
  const signal = AbortSignal.timeout(30_000);
  for (let count = 0; count < 5; count += 1) {
    if (url.protocol !== "https:" || !origins.has(url.hostname) || url.username || url.password || url.port) {
      throw new Error("Unapproved package origin: " + url.hostname);
    }
    const response = await fetch(url, {
      redirect: "manual",
      signal,
      headers: { "User-Agent": "procurement-workshop-skill-bootstrap/1" },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    if (!response.ok || !response.body) throw new Error("Skill download returned HTTP " + response.status);
    return response.body;
  }
  throw new Error("Skill download exceeded the redirect limit.");
}

async function download([path, url, digest, executable]: SkillFile, directory: string) {
  const reader = (await approvedDownload(url)).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maxBytes) throw new Error("File exceeds bootstrap size limit: " + path);
      chunks.push(result.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const contents = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    contents.set(chunk, offset);
    offset += chunk.byteLength;
  }
  checkDigest(contents, digest, path);
  const destination = join(directory, packagePath(path));
  await mkdir(dirname(destination), { recursive: true });
  await Bun.write(destination, contents);
  if (executable) await chmod(destination, 0o755);
}

async function install(directory: string, files: SkillFile[]) {
  await mkdir(skillsRoot, { recursive: true });
  const staging = await mkdtemp(join(dirname(skillsRoot), "skill-bootstrap-"));
  try {
    for (let index = 0; index < files.length; index += 8) {
      const results = await Promise.allSettled(files.slice(index, index + 8).map((entry) => download(entry, staging)));
      for (const result of results) if (result.status === "rejected") throw result.reason;
    }
    await verify(staging, files);
    await rename(staging, directory);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function main() {
  const args = Bun.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--verify")) throw new Error("Usage: bootstrap-skills.ts [--verify]");
  const lock: { schemaVersion: number; skills: Skill[] } = await Bun.file(new URL("skills-lock.json", import.meta.url)).json();
  if (lock.schemaVersion !== 1) throw new Error("Unsupported skill lock version.");
  if ((await fileInfo(skillsRoot))?.isSymbolicLink() || (await fileInfo(dirname(skillsRoot)))?.isSymbolicLink()) {
    throw new Error("Install in a repository-local .agents/skills directory.");
  }
  let failures = 0;
  for (const { name, path, files } of lock.skills) {
    const directory = join(root, packagePath(path));
    if (dirname(directory) !== skillsRoot || basename(directory) !== name) throw new Error("Invalid destination for " + name);
    try {
      if (!args.length && !(await fileInfo(directory))) await install(directory, files);
      await verify(directory, files);
      console.log("pass " + name);
    } catch (error) {
      failures += 1;
      console.error("fail " + name + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
  return Number(failures > 0);
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The skill bootstrap could not finish.");
  process.exitCode = 2;
}
