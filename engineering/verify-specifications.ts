import { dirname, join } from "node:path";
import { fileInfo, relativePath, root } from "./runtime";

const docs = join(root, "doc-specs");
const sources = [
  join(root, "README.md"),
  join(root, "AGENTS.md"),
  ...new Bun.Glob("**/*.md").scanSync({ cwd: docs, absolute: true }),
];
const problems = [];
let count = 0;

for (const source of sources) {
  for (const [, target] of (await Bun.file(source).text()).matchAll(/\]\(([^\s)]+)\)/g)) {
    if (target.includes("://") || target.startsWith("mailto:") || target.startsWith("#")) continue;
    const path = decodeURIComponent(target.split("#", 1)[0]);
    if (!/^[A-Za-z0-9._/]/.test(path)) continue;
    count += 1;
    if (!(await fileInfo(join(dirname(source), path)))) problems.push(relativePath(source) + " links to missing " + path);
  }
}

const prd = await Bun.file(join(docs, "01-product-requirements.md")).text();
const tickets = await Bun.file(join(docs, "TICKETS.md")).text();
for (let index = 1; index <= 9; index += 1) {
  const criterion = "AC-0" + index;
  if (!prd.includes("| " + criterion + " |") || !prd.includes("@" + criterion)) {
    problems.push("missing acceptance criterion or Gherkin tag " + criterion);
  }
}
for (let index = 0; index < 8; index += 1) {
  const ticket = "VS-0" + index;
  if ([...tickets.matchAll(new RegExp("^\\| " + ticket + "\\s", "gm"))].length !== 1) {
    problems.push("expected one ticket for " + ticket);
  }
}

for (const problem of problems) console.error(problem);
if (!problems.length) console.log("Checked " + count + " repository links, nine Gherkin criterion tags and eight ticket rows.");
process.exitCode = Number(Boolean(problems.length));
