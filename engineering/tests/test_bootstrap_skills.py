import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

ENGINEERING = pathlib.Path(__file__).resolve().parents[1]


class VerifySkillsTest(unittest.TestCase):
    def test_check_matches_locked_bytes_and_rejects_mutation(self):
        with tempfile.TemporaryDirectory() as work:
            repo = pathlib.Path(work)
            skill = repo / ".agents/skills/example"
            skill.mkdir(parents=True)
            manifest = skill / "SKILL.md"
            contents = b"---\nname: example\ndescription: Fixture.\n---\n"
            manifest.write_bytes(contents)
            engineering = repo / "engineering"
            engineering.mkdir()
            script = engineering / "bootstrap-skills.py"
            shutil.copyfile(ENGINEERING / script.name, script)
            lock = {
                "schemaVersion": 1,
                "skills": [{
                    "name": "example",
                    "path": ".agents/skills/example",
                    "files": [["SKILL.md", "https://raw.githubusercontent.com/example", hashlib.sha256(contents).hexdigest(), False]],
                }],
            }
            (engineering / "skills-lock.json").write_text(json.dumps(lock))
            command = [sys.executable, str(script), "--verify"]
            valid = subprocess.run(command, capture_output=True, text=True, timeout=10)
            self.assertEqual(valid.returncode, 0, valid.stdout + valid.stderr)
            manifest.write_bytes(contents + b"changed")
            changed = subprocess.run(command, capture_output=True, text=True, timeout=10)
            self.assertEqual(changed.returncode, 1, changed.stdout + changed.stderr)
            self.assertIn("digest mismatch", changed.stderr)
            self.assertEqual(manifest.read_bytes(), contents + b"changed")
