#!/usr/bin/env python3
"""Assemble DESIGN.md from the section partials.

Run from anywhere:  python docs/06-design-reference/build-design.py
Edit the partials in _partials/, never DESIGN.md directly - it is generated.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARTIALS = ROOT / "docs" / "06-design-reference" / "_partials"
OUT = ROOT / "DESIGN.md"

HEADER = "00-header.md"
SECTIONS = [
    "01-foundations.md",
    "02-layout-navigation.md",
    "03-data-display.md",
    "04-forms-inputs.md",
    "05-feedback-overlays.md",
    "06-eyvar-mapping.md",
    "07-accessibility.md",
    "08-eyvar-patterns.md",
    "09-rtl-localisation.md",
]


def slug(text: str) -> str:
    """GitHub's heading-anchor algorithm, close enough for our headings."""
    s = text.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)   # drop punctuation, keep word chars
    s = s.replace(" ", "-")
    return s


def main() -> None:
    missing = [f for f in SECTIONS if not (PARTIALS / f).exists()]
    present = [f for f in SECTIONS if (PARTIALS / f).exists()]

    header = (PARTIALS / HEADER).read_text(encoding="utf-8").split("\n")
    # front matter = everything before the first '## '
    cut = next(i for i, l in enumerate(header) if l.startswith("## "))
    front, rest = header[:cut], header[cut:]

    toc = ["## Contents", ""]
    for fname in present:
        for line in (PARTIALS / fname).read_text(encoding="utf-8").split("\n"):
            if line.startswith("### "):
                title = line[4:].strip()
                toc.append(f"  - [{title}](#{slug(title)})")
            elif line.startswith("## "):
                title = line[3:].strip()
                toc.append(f"- [{title}](#{slug(title)})")
    toc.append("")

    body = []
    for fname in present:
        body += ["---", "", (PARTIALS / fname).read_text(encoding="utf-8").rstrip(), ""]

    OUT.write_text("\n".join(front + toc + rest + [""] + body) + "\n", encoding="utf-8")

    print(f"wrote {OUT.relative_to(ROOT)}  ({len(OUT.read_text(encoding='utf-8').splitlines())} lines)")
    print(f"sections: {len(present)}")
    if missing:
        print("MISSING (skipped): " + ", ".join(missing))


if __name__ == "__main__":
    main()
