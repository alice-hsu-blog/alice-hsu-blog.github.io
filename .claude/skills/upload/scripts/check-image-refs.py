#!/usr/bin/env python3
"""Check image references in blog posts.

For every new/modified post in content/posts/ (plus any paths passed as args),
verify each image reference:
  * starts with a leading slash  (/images/...)
  * has no trailing slash
  * points to a file that exists on disk with EXACT case

macOS is case-insensitive, so a wrong-case reference works locally but 404s on
GitHub Pages (Linux). This catches that before it ships.

Exit code 0 = all good, 1 = problems found (details printed).
"""
import os
import re
import subprocess
import sys

ROOT = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"], text=True
).strip()
os.chdir(ROOT)

posts = set(a for a in sys.argv[1:] if a.endswith(".md"))

status = subprocess.check_output(
    ["git", "status", "--porcelain=v1", "--untracked-files=all"], text=True
)
for line in status.splitlines():
    path = line[3:].strip().strip('"')
    if " -> " in path:
        path = path.split(" -> ", 1)[1]
    if path.startswith("content/posts/") and path.endswith(".md"):
        posts.add(path)

PATTERNS = [
    re.compile(r"""cover\s*=\s*['"]([^'"]+)['"]"""),
    re.compile(r"!\[[^\]]*\]\(([^)\s]+)\)"),
    re.compile(r"""src\s*=\s*['"]([^'"]+)['"]"""),
]

problems = 0
checked = 0

for post in sorted(posts):
    if not os.path.isfile(post):
        continue
    text = open(post, encoding="utf-8").read()
    refs = []
    for pat in PATTERNS:
        refs.extend(pat.findall(text))

    seen = set()
    for ref in refs:
        ref = ref.strip()
        if "images/" not in ref:
            continue
        if ref in seen:
            continue
        seen.add(ref)
        checked += 1

        issues = []
        if not ref.startswith("/"):
            issues.append("missing leading slash (should be '/images/...')")
        if ref.endswith("/"):
            issues.append("trailing slash on the path")

        clean = "/" + ref.strip().lstrip("/")
        rel = "static" + clean
        directory, base = os.path.split(rel)

        if not os.path.isdir(directory):
            issues.append(f"folder does not exist: {directory}")
        else:
            entries = os.listdir(directory)
            if base not in entries:
                ci = [e for e in entries if e.lower() == base.lower()]
                if ci:
                    issues.append(
                        f"WRONG CASE - reference says '{base}', "
                        f"actual file on disk is '{ci[0]}'"
                    )
                else:
                    issues.append("no such file on disk")

        if issues:
            problems += 1
            print(f"[{post}]")
            print(f"    reference: {ref}")
            for i in issues:
                print(f"    - {i}")
            print()

if problems == 0:
    print(f"OK - {checked} image reference(s) checked, all valid.")
    sys.exit(0)
else:
    print(f"{problems} problem(s) found across {checked} reference(s).")
    sys.exit(1)
