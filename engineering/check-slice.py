"""Run the declared checks for one slice and retain an evidence manifest."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import sys
from time import monotonic

ROOT = Path(__file__).resolve().parents[1]
MAX_ATTEMPTS = 3


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, timeout=15).strip()


def reserve_attempt(run):
    run.mkdir(parents=True, exist_ok=True)
    for index in range(MAX_ATTEMPTS):
        attempt = run / f"attempt-{index}"
        if attempt.exists():
            manifest_file = attempt / "manifest.json"
            if not manifest_file.is_file():
                raise ValueError(f"unfinished attempt at {attempt}")
            previous = json.loads(manifest_file.read_text(encoding="utf-8"))
            if previous["status"] == "pass" and not previous["worktreeDirty"]:
                raise ValueError("checks already passed for this run")
            continue
        attempt.mkdir()
        return index, attempt
    raise ValueError("attempt budget exhausted; inspect the prior evidence and seek human review")


def execute(check, attempt):
    argv = [sys.executable if arg == "{python}" else arg for arg in check["argv"]]
    log = attempt / (check["id"] + ".log")
    started_at = timestamp()
    start = monotonic()
    exit_code = None
    with log.open("wb") as output:
        try:
            process = subprocess.run(
                argv, cwd=ROOT, stdin=subprocess.DEVNULL, stdout=output,
                stderr=subprocess.STDOUT, timeout=check["timeoutSeconds"], check=False,
            )
            exit_code = process.returncode
            status = "pass" if exit_code == 0 else "fail"
        except subprocess.TimeoutExpired:
            output.write(b"Check exceeded its timeout.\n")
            status = "fail"
        except OSError as error:
            output.write(f"Unable to start check: {error}\n".encode())
            status = "blocked"
    return {
        "id": check["id"],
        "criteria": check.get("criteria", []),
        "command": argv,
        "status": status,
        "exitCode": exit_code,
        "startedAt": started_at,
        "finishedAt": timestamp(),
        "durationSeconds": round(monotonic() - start, 3),
        "artifactPaths": [log.relative_to(ROOT).as_posix()],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slice", help="one target from engineering/slice-checks.json")
    parser.add_argument("run_id", help="a stable lowercase name shared by the initial attempt and retries")
    args = parser.parse_args()
    definitions = json.loads((ROOT / "engineering/slice-checks.json").read_text(encoding="utf-8"))
    checks = definitions.get(args.slice)
    if isinstance(checks, dict):
        checks = definitions[checks["base"]] + checks["checks"]
    if not checks or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", args.run_id):
        parser.error("expected a configured slice and a run ID containing lowercase letters, digits or hyphens")
    run = ROOT / "artifacts/verification" / args.slice / args.run_id
    try:
        revision = git("rev-parse", "HEAD")
        dirty = bool(git("status", "--porcelain"))
        index, attempt = reserve_attempt(run)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        parser.error(str(error))

    results = [execute(check, attempt) for check in checks]
    statuses = {check["status"] for check in results}
    status = "blocked" if "blocked" in statuses else "fail" if "fail" in statuses else "pass"
    manifest = {
        "schemaVersion": 1,
        "slice": args.slice,
        "runId": args.run_id,
        "attempt": index,
        "candidateSha": revision,
        "worktreeDirty": dirty or bool(git("status", "--porcelain")) or git("rev-parse", "HEAD") != revision,
        "environment": "isolated-lab",
        "toolVersions": {"python": sys.version.split()[0], "git": git("--version")},
        "status": status,
        "humanReview": "pending",
        "checks": results,
    }
    path = attempt / "manifest.json"
    pending = path.with_suffix(".tmp")
    pending.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    pending.rename(path)
    print(path.relative_to(ROOT))
    return int(status != "pass" or manifest["worktreeDirty"])


if __name__ == "__main__":
    raise SystemExit(main())
