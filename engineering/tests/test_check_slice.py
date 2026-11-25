import json
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ENGINEERING = Path(__file__).resolve().parents[1]


class CheckSliceTest(unittest.TestCase):
    def test_keeps_attempts_and_stops_after_two_retries(self):
        with TemporaryDirectory() as work:
            repo = Path(work)
            engineering = repo / "engineering"
            engineering.mkdir()
            (repo / ".gitignore").write_text("artifacts/\n")
            runner = engineering / "check-slice.py"
            shutil.copyfile(ENGINEERING / runner.name, runner)
            checks = {"VS-00": [
                {"id": "smoke", "argv": ["{python}", "-c", "raise SystemExit(3)"], "timeoutSeconds": 5},
                {"id": "static", "argv": ["{python}", "-c", "print('checked')"], "timeoutSeconds": 5},
            ]}
            (engineering / "slice-checks.json").write_text(json.dumps(checks))
            self.git(repo, "init", "-q")
            self.git(repo, "add", ".")
            self.git(repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Fixture")
            command = [sys.executable, str(runner), "VS-00", "rehearsal"]
            output = repo / "artifacts/verification/VS-00/rehearsal"
            for attempt in range(3):
                result = subprocess.run(command, cwd=repo, capture_output=True, text=True, timeout=10)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                manifest = json.loads((output / f"attempt-{attempt}/manifest.json").read_text())
                self.assertEqual(manifest["attempt"], attempt)
                self.assertEqual(manifest["candidateSha"], self.git(repo, "rev-parse", "HEAD").strip())
                self.assertFalse(manifest["worktreeDirty"])
                self.assertEqual(manifest["checks"][0]["exitCode"], 3)
                self.assertEqual(manifest["checks"][1]["status"], "pass")
            result = subprocess.run(command, cwd=repo, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertEqual(len(list(output.iterdir())), 3)

    @staticmethod
    def git(repo, *args):
        return subprocess.check_output(["git", *args], cwd=repo, text=True)
