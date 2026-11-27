import { dirname, join } from "node:path";
import { fileInfo, relativePath, root } from "./runtime";

const sources = [
  join(root, "README.md"),
  join(root, "AGENTS.md"),
  join(root, "PRD.md"),
  join(root, "SPEC.md"),
  join(root, "formal/README.md"),
  join(root, "slides/README.md"),
  ...new Bun.Glob("**/*.md").scanSync({ cwd: join(root, "docs"), absolute: true }),
  ...new Bun.Glob("**/*.md").scanSync({ cwd: join(root, "skills"), absolute: true }),
  ...new Bun.Glob("**/*.md").scanSync({ cwd: join(root, "starter-kit"), absolute: true }),
];

const problems: string[] = [];
let count = 0;

for (const source of sources) {
  if (!(await fileInfo(source))) continue;
  const text = await Bun.file(source).text();
  // Strip fenced code blocks so template placeholders inside code blocks aren't treated as file links.
  const withoutCode = text.replace(/```[\s\S]*?```/g, "");
  for (const [, target] of withoutCode.matchAll(/\]\(([^\s)]+)\)/g)) {
    if (target.includes("://") || target.startsWith("mailto:") || target.startsWith("#") || target.includes("<")) continue;
    const path = decodeURIComponent(target.split("#", 1)[0]);
    if (!/^[A-Za-z0-9._/]/.test(path)) continue;
    count += 1;
    if (!(await fileInfo(join(dirname(source), path)))) {
      problems.push(`${relativePath(source)} links to missing ${path}`);
    }
  }
}

const prd = await Bun.file(join(root, "PRD.md")).text();
for (let i = 1; i <= 10; i += 1) {
  const inv = `INV-${String(i).padStart(2, "0")}`;
  if (!prd.includes(`\`${inv}\``)) problems.push(`PRD.md missing invariant ${inv}`);
}
for (let i = 1; i <= 7; i += 1) {
  const tag = `@AC-0${i}`;
  if (!prd.includes(tag)) problems.push(`PRD.md missing Gherkin scenario tag ${tag}`);
}

for (const problem of problems) console.error(problem);
if (!problems.length) {
  console.log(`Checked ${count} markdown links, 10 invariants (INV-01..INV-10), and Gherkin AC tags.`);
}
process.exitCode = Number(Boolean(problems.length));
