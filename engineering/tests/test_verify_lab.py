import json
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest


class VerifyLabTest(unittest.TestCase):
    def test_blocked_launch_preserves_evidence_and_rejects_reusing_run_id(self):
        with TemporaryDirectory() as directory:
            repo = Path(directory)
            engineering = repo / "engineering"
            engineering.mkdir()
            script = engineering / "verify-lab.py"
            shutil.copyfile(Path(__file__).resolve().parents[1] / script.name, script)
            (repo / ".gitignore").write_text("artifacts/\n", encoding="utf-8")
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(
                ["git", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                 "commit", "-qm", "Fixture"],
                cwd=repo, check=True,
            )
            command = [sys.executable, str(script), "--run-id", "missing-postgres",
                       "--postgres-bin", str(repo / "unavailable")]
            result = subprocess.run(command, cwd=repo, capture_output=True, text=True, timeout=15)
            self.assertEqual(result.returncode, 2, result.stderr + result.stdout)
            path = repo / "artifacts/verification/VS-04/missing-postgres/lifecycle/manifest.json"
            original = path.read_bytes()
            document = json.loads(original)
            self.assertEqual(document["status"], "blocked")
            stages = {stage["id"]: stage["status"] for stage in document["stages"]}
            self.assertEqual(stages, {
                "launch": "blocked", "doctor": "not-run", "drive": "not-run",
                "evidence": "not-run", "cleanup": "pass",
            })
            repeated = subprocess.run(command, cwd=repo, capture_output=True, text=True, timeout=15)
            self.assertEqual(repeated.returncode, 2)
            self.assertEqual(path.read_bytes(), original)
