"""Check internal Markdown links and the specification index's ID coverage."""

from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "doc-specs"
LINK = re.compile(r"\]\(([^\s)]+)\)")


def main():
    sources = [ROOT / "README.md", ROOT / "AGENTS.md", *DOCS.rglob("*.md")]
    problems = []
    count = 0
    for source in sources:
        for target in LINK.findall(source.read_text(encoding="utf-8")):
            if "://" in target or target.startswith(("mailto:", "#")):
                continue
            path = unquote(target.split("#", 1)[0])
            if not path or not re.match(r"[A-Za-z0-9._/]", path):
                continue
            count += 1
            if not (source.parent / path).exists():
                problems.append(f"{source.relative_to(ROOT)} links to missing {path}")

    prd = (DOCS / "01-product-requirements.md").read_text(encoding="utf-8")
    tickets = (DOCS / "TICKETS.md").read_text(encoding="utf-8")
    for index in range(1, 10):
        criterion = f"AC-{index:02}"
        if f"| {criterion} |" not in prd or f"@{criterion}" not in prd:
            problems.append(f"missing acceptance criterion or Gherkin tag {criterion}")
    for index in range(8):
        ticket = f"VS-{index:02}"
        if len(re.findall(rf"^\| {ticket}\s", tickets, flags=re.MULTILINE)) != 1:
            problems.append(f"expected one ticket for {ticket}")
    for problem in problems:
        print(problem, file=sys.stderr)
    if not problems:
        print(f"Checked {count} repository links, nine Gherkin criterion tags and eight ticket rows.")
    return int(bool(problems))


if __name__ == "__main__":
    raise SystemExit(main())
