"""Own a disposable Procurement Hub lab and retain evidence after teardown."""

import argparse
from contextlib import ExitStack, contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory
from time import monotonic, sleep

ROOT = Path(__file__).resolve().parents[1]
VERIFICATION_DIR = ROOT / "artifacts/verification"
NEXT = "node_modules/next/dist/bin/next"
STAGES = ("launch", "doctor", "drive", "evidence", "cleanup")
CREATE_DATABASE = """
import postgres from "postgres";
import { labConnectionString } from "./src/server/db/lab-config.mjs";
const target = new URL(labConnectionString());
target.pathname = "/postgres";
const client = postgres(target.toString(), { max: 1, connect_timeout: 3 });
try { await client`create database procurement_hub_lab`; }
finally { await client.end({ timeout: 3 }); }
"""


class LabError(Exception):
    def __init__(self, message, status="blocked"):
        super().__init__(message)
        self.status = status


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, timeout=15).strip()


def free_port(exclude=None):
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
        if port == exclude:
            return free_port(exclude)
        return port


def wait_for_listener(process, port, seconds):
    deadline = monotonic() + seconds
    while monotonic() < deadline:
        if process.poll() is not None:
            raise LabError(f"Owned process exited before opening loopback port {port}.")
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.3):
                return
        except OSError:
            sleep(0.15)
    raise LabError(f"Timed out waiting for owned loopback port {port}.")


@contextmanager
def owned_process(argv, output, env):
    with output.open("wb") as stream:
        process = subprocess.Popen(
            argv, cwd=ROOT, env=env, stdin=subprocess.DEVNULL, stdout=stream,
            stderr=subprocess.STDOUT,
        )
        try:
            yield process
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


def executable(directory, name):
    direct = directory / (name + (".exe" if os.name == "nt" else ""))
    if not direct.is_file() or not os.access(direct, os.X_OK):
        raise LabError(f"Standalone PostgreSQL executable is unavailable: {name}.")
    return str(direct)


def last_json(log):
    for line in reversed(log.read_text(encoding="utf-8", errors="replace").splitlines()):
        if line.startswith("{"):
            return json.loads(line)
    raise LabError(f"No JSON evidence in {log.name}.")


class LabRun:
    def __init__(self, slice_id, run_id, path, postgres_bin):
        self.slice_id = slice_id
        self.run_id = run_id
        self.path = path
        self.postgres_bin = postgres_bin
        self.resources = ExitStack()
        self.env = os.environ.copy()
        self.app_port = free_port()
        self.db_port = free_port(self.app_port)
        self.password = secrets.token_hex(20)
        self.env.update(
            WORKSHOP_DB_PORT=str(self.db_port),
            WORKSHOP_DB_PASSWORD=self.password,
            WORKSHOP_DATABASE_URL=f"postgresql://procurement:{self.password}@127.0.0.1:{self.db_port}/procurement_hub_lab",
            WORKSHOP_LAB_MODE="enabled",
            WORKSHOP_BASE_URL=f"http://127.0.0.1:{self.app_port}",
            WORKSHOP_PLAYWRIGHT_OUTPUT_DIR=str(self.path.parent / "browser-results"),
            NEXT_TELEMETRY_DISABLED="1",
        )
        self.report = {
            "schemaVersion": 1,
            "slice": slice_id,
            "runId": run_id,
            "environment": "isolated-lab",
            "runtime": "standalone-postgres" if postgres_bin else "docker-compose",
            "loopbackPorts": {"application": self.app_port, "postgresql": self.db_port},
            "startedAt": timestamp(),
            "candidateSha": git("rev-parse", "HEAD"),
            "candidateTree": git("rev-parse", "HEAD^{tree}"),
            "worktreeDirty": bool(git("status", "--porcelain")),
            "toolVersions": {"python": sys.version.split()[0], "git": git("--version")},
            "humanReview": "pending",
            "stages": [{"id": stage, "status": "not-run", "commands": []} for stage in STAGES],
        }

    def command(self, argv, name, timeout, *, expected=0, status="blocked"):
        output = self.path / (name + ".log")
        entry = {
            "command": [str(arg) for arg in argv],
            "expectedExitCode": expected,
            "exitCode": None,
            "artifactPath": output.relative_to(ROOT).as_posix(),
        }
        self.stage["commands"].append(entry)
        with output.open("wb") as stream:
            result = subprocess.run(
                argv, cwd=ROOT, env=self.env, stdin=subprocess.DEVNULL,
                stdout=stream, stderr=subprocess.STDOUT, timeout=timeout, check=False,
            )
        entry["exitCode"] = result.returncode
        if result.returncode != expected:
            raise LabError(f"{name} exited {result.returncode}.", status)
        return output

    def stage_action(self, stage, action):
        self.stage = next(item for item in self.report["stages"] if item["id"] == stage)
        self.stage["startedAt"] = timestamp()
        start = monotonic()
        try:
            action()
            self.stage["status"] = "pass"
        except LabError as error:
            self.stage.update(status=error.status, detail=str(error))
        except (ValueError, OSError, subprocess.SubprocessError):
            self.stage.update(status="blocked", detail=f"{stage} could not finish. See lifecycle logs.")
        except KeyboardInterrupt:
            self.stage.update(status="blocked", detail="Run interrupted.")
            raise
        finally:
            self.stage.update(finishedAt=timestamp(), durationSeconds=round(monotonic() - start, 3))
        return self.stage["status"] == "pass"

    def start_standalone(self, initdb, postgres):
        workspace = Path(self.resources.enter_context(TemporaryDirectory(prefix="procurement-vs04-")))
        cluster = workspace / "data"
        password_file = workspace / "password"
        password_file.write_text(self.password + "\n", encoding="utf-8")
        try:
            self.command([
                initdb, "-D", str(cluster), "--username=procurement",
                "--auth-local=reject", "--auth-host=scram-sha-256",
                "--pwfile", str(password_file), "--no-locale", "--encoding=UTF8",
            ], "postgres-init", 45)
        finally:
            password_file.unlink(missing_ok=True)
        server = self.resources.enter_context(owned_process([
            postgres, "-D", str(cluster), "-h", "127.0.0.1", "-p", str(self.db_port),
            "-c", "unix_socket_directories=",
        ], self.path / "postgres.log", self.env))
        wait_for_listener(server, self.db_port, 20)
        self.command(["node", "--input-type=module", "-e", CREATE_DATABASE], "postgres-create-db", 15)

    def start_compose(self, docker):
        host = self.env.get("DOCKER_HOST", "")
        context_file = self.command(
            [docker, "context", "inspect", "--format", "{{.Endpoints.docker.Host}}"],
            "docker-context", 10,
        )
        context_host = context_file.read_text(encoding="utf-8").strip()
        if not context_host.startswith(("unix://", "npipe://")) or (host and not host.startswith(("unix://", "npipe://"))):
            raise LabError("Select a local Docker context before running the lab.")
        project = "procurement-vs04-" + secrets.token_hex(8)
        self.report["composeProject"] = project
        compose = [docker, "compose", "-p", project, "-f", str(ROOT / "compose.yaml")]

        # Register cleanup before startup in case Compose partially creates resources.
        self.resources.callback(self.command, [*compose, "down", "--volumes", "--timeout", "10"], "compose-down", 40)
        self.command([*compose, "up", "--wait", "--wait-timeout", "60", "db"], "compose-up", 90)

    def launch(self):
        if self.postgres_bin:
            pg_tools = [executable(self.postgres_bin, name) for name in ("initdb", "postgres")]
        elif not (docker := shutil.which("docker")):
            raise LabError("Docker is unavailable. Supply --postgres-bin for standalone PostgreSQL.")
        if not (ROOT / NEXT).is_file():
            raise LabError("Workshop dependencies are missing. Run npm ci first.")

        lock = VERIFICATION_DIR / ".active"
        try:
            lock.mkdir()
        except FileExistsError as error:
            raise LabError("The checkout already has a lab run in progress.") from error
        self.resources.callback(lock.rmdir)

        node_version = self.command(["node", "--version"], "node-version", 10)
        self.report["toolVersions"]["node"] = node_version.read_text(encoding="utf-8").strip()
        self.command(["node", NEXT, "build"], "build", 180)
        if self.postgres_bin:
            self.start_standalone(*pg_tools)
        else:
            self.start_compose(docker)
        self.command(["node", "scripts/init-lab.mjs"], "lab-init", 45)
        app = self.resources.enter_context(owned_process([
            "node", NEXT, "start", "--hostname", "127.0.0.1", "--port", str(self.app_port),
        ], self.path / "app.log", self.env))
        wait_for_listener(app, self.app_port, 40)

    def doctor(self):
        self.report["doctor"] = {}
        for mode, options in (("database", ["--db-only"]), ("application", [])):
            output = self.command(["node", "scripts/lab-doctor.mjs", *options], f"doctor-{mode}", 20)
            self.report["doctor"][mode] = last_json(output)

    def drive(self):
        self.command([sys.executable, "engineering/check-slice.py", self.slice_id, self.run_id], "drive", 450, status="fail")

    def capture(self):
        browser_results = self.path.parent / "browser-results"
        if browser_results.is_dir():
            self.report["browserResults"] = browser_results.relative_to(ROOT).as_posix()
        attempt = self.path.parent / "attempt-0"
        manifest = attempt / "manifest.json"
        if not manifest.is_file():
            raise LabError("The check runner did not produce a manifest.")
        checks = json.loads(manifest.read_text(encoding="utf-8"))
        if checks["candidateSha"] != self.report["candidateSha"]:
            raise LabError("The revision changed between launch and verification.", "fail")
        self.report["checkManifest"] = manifest.relative_to(ROOT).as_posix()
        self.report["worktreeDirty"] |= checks["worktreeDirty"]
        live = last_json(attempt / "ph42-live-invariant.log")
        # Copy only the public verification fields from the driver output.
        keys = ("status", "httpStatuses", "sameRequest", "requestCount", "creationEventCount")
        self.report["observations"] = {
            "liveApi": {key: live[key] for key in keys if key in live},
        }
        output = self.command(["node", "scripts/verify-ph42-fixture.mjs"], "fixture-observation", 15, expected=1)
        fixture = last_json(output)
        self.report["observations"]["syntheticSnapshot"] = {
            key: fixture[key] for key in ("source", *keys) if key in fixture
        }

    def run(self):
        try:
            if self.stage_action("launch", self.launch) and self.stage_action("doctor", self.doctor):
                self.stage_action("drive", self.drive)
                self.stage_action("evidence", self.capture)
        except KeyboardInterrupt:
            pass
        finally:
            self.stage_action("cleanup", self.resources.close)
            self.report["worktreeDirty"] |= bool(git("status", "--porcelain"))
            self.report["worktreeDirty"] |= git("rev-parse", "HEAD") != self.report["candidateSha"]
            states = {stage["status"] for stage in self.report["stages"]}
            status = "fail"
            if "blocked" in states:
                status = "blocked"
            elif states == {"pass"} and not self.report["worktreeDirty"]:
                status = "pass"
            self.report.update(status=status, finishedAt=timestamp())
            output = self.path / "manifest.json"
            pending = output.with_suffix(".tmp")
            pending.write_text(json.dumps(self.report, indent=2) + "\n", encoding="utf-8")
            pending.replace(output)
            print(f"{status}: {output.relative_to(ROOT).as_posix()}")
        return {"pass": 0, "fail": 1, "blocked": 2}[status]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slice", choices=("VS-04", "VS-05"), default="VS-04")
    parser.add_argument("--run-id", default=datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + "-" + secrets.token_hex(4))
    parser.add_argument("--postgres-bin", type=Path, help="use local initdb and postgres executables instead of Docker")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", args.run_id):
        parser.error("run ID must contain 1–64 lowercase letters, digits or hyphens")

    run = VERIFICATION_DIR / args.slice / args.run_id
    try:
        run.mkdir(parents=True, exist_ok=False)
        lifecycle = run / "lifecycle"
        lifecycle.mkdir()
        lab = LabRun(args.slice, args.run_id, lifecycle, args.postgres_bin)
    except (OSError, subprocess.SubprocessError):
        parser.error("could not create a new run in the current Git checkout")
    return lab.run()


def interrupt(_signal, _frame):
    raise KeyboardInterrupt


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupt)
    raise SystemExit(main())
