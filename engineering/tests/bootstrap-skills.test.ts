import assert from "node:assert/strict";
import { test } from "vitest";
import { join } from "node:path";
import { run, withFixture } from "./fixture";

test("the skill bootstrap verifies locked bytes and reports any mutation", async () => {
  await withFixture("bootstrap-skills.ts", async (repo) => {
    const manifest = join(repo, ".agents/skills/example/SKILL.md");
    const contents = "---\nname: example\ndescription: Fixture.\n---\n";
    await Bun.write(manifest, contents);
    const lock = {
      schemaVersion: 1,
      skills: [{
        name: "example", path: ".agents/skills/example",
        files: [["SKILL.md", "https://raw.githubusercontent.com/example",
          new Bun.CryptoHasher("sha256").update(contents).digest("hex"), false]],
      }],
    };
    await Bun.write(join(repo, "engineering/skills-lock.json"), JSON.stringify(lock));
    assert.equal(run(repo, "bootstrap-skills.ts", "--verify").exitCode, 0);

    await Bun.write(manifest, contents + "changed");
    const changed = run(repo, "bootstrap-skills.ts", "--verify");
    assert.equal(changed.exitCode, 1);
    assert.match(changed.stderr.toString(), /digest mismatch/);
    assert.equal(await Bun.file(manifest).text(), contents + "changed");
  });
});
