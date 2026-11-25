"""Install and verify the workshop's pinned local skill packages."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
from tempfile import TemporaryDirectory
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ORIGINS = {"raw.githubusercontent.com", "uizze.sh"}


def relative_path(value):
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or "\\" in value or ":" in value or not path.parts:
        raise ValueError("invalid package path: " + value)
    return Path(*path.parts)


def check_digest(data, digest, path):
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f"digest mismatch: {path}")


def verify(directory, files):
    expected = {relative_path(entry[0]) for entry in files}
    entries = list(directory.rglob("*"))
    if directory.is_symlink() or any(path.is_symlink() for path in entries):
        raise ValueError(f"unexpected symbolic link in {directory}")
    actual = {path.relative_to(directory) for path in entries if path.is_file()}
    if expected != actual or Path("SKILL.md") not in expected:
        raise ValueError(f"file list differs from lock in {directory}")
    for path, _, digest, _ in files:
        check_digest((directory / relative_path(path)).read_bytes(), digest, path)


def require_origin(url):
    origin = urlparse(url)
    if origin.scheme != "https" or origin.hostname not in ORIGINS:
        raise ValueError(f"unapproved package origin: {origin.hostname}")


def download(entry, directory):
    path, url, digest, executable = entry
    require_origin(url)
    request = Request(url, headers={"User-Agent": "procurement-workshop-skill-bootstrap/1"})
    with urlopen(request, timeout=30) as response:
        require_origin(response.url)
        data = response.read(8_388_609)
    if len(data) > 8_388_608:
        raise ValueError(f"file exceeds bootstrap size limit: {path}")
    check_digest(data, digest, path)
    destination = directory / relative_path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    if executable:
        destination.chmod(0o755)


def install(directory, files, staging_root):
    with TemporaryDirectory(prefix="skill-bootstrap-", dir=staging_root) as temporary:
        staging = Path(temporary) / directory.name
        staging.mkdir()
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda entry: download(entry, staging), files))
        verify(staging, files)
        staging.rename(directory)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="check an existing installation without network access")
    args = parser.parse_args()
    lock = json.loads((ROOT / "engineering/skills-lock.json").read_text(encoding="utf-8"))
    if lock["schemaVersion"] != 1:
        parser.error("unsupported skill lock version")
    skills_root = ROOT / ".agents/skills"
    if skills_root.is_symlink() or skills_root.parent.is_symlink():
        parser.error("install in a repository-local .agents/skills directory")
    failures = 0
    for skill in lock["skills"]:
        target = ROOT / relative_path(skill["path"])
        if target.parent != skills_root or target.name != skill["name"]:
            parser.error(f"invalid destination for {skill['name']}")
        try:
            if not target.exists() and not target.is_symlink() and not args.verify:
                skills_root.mkdir(parents=True, exist_ok=True)
                install(target, skill["files"], skills_root.parent)
            verify(target, skill["files"])
            print(f"pass {skill['name']}", flush=True)
        except (OSError, ValueError) as error:
            print(f"fail {skill['name']}: {error}", file=sys.stderr, flush=True)
            failures += 1
    return int(failures > 0)


if __name__ == "__main__":
    raise SystemExit(main())
