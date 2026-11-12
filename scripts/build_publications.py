#!/usr/bin/env python3
"""Build scripts/publications_data.js from the CV's publications.tex.

Usage:
    python3 scripts/build_publications.py [--input ../Latex/CV-Suraj/publications.tex]

The CV is the single source of truth. Add a paper there, re-run this script,
and the Publications page picks it up.
"""
import argparse
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

GREEK = {
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "eta": "η",
    "psi": "ψ", "Lambda": "Λ", "mu": "μ", "pi": "π", "rho": "ρ", "phi": "φ",
}


def balanced(s, i):
    """Return (content, end) of the {...} group starting at s[i] == '{'."""
    depth = 0
    for j in range(i, len(s)):
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
    return s[i + 1:], len(s)


def strip_cmd(s, cmd):
    """Replace \\cmd{x} by x (one argument)."""
    out, i = "", 0
    pat = "\\" + cmd + "{"
    while True:
        k = s.find(pat, i)
        if k < 0:
            return out + s[i:]
        inner, end = balanced(s, k + len(pat) - 1)
        out += s[i:k] + inner
        i = end


def math_to_html(m):
    m = m.strip()
    m = re.sub(r"\\sqrt\{?s_\{(?:\\rm\s*)?NN\}\}?", "√<i>s</i><sub>NN</sub>", m)
    m = re.sub(r"\\sqrt\{s\}", "√<i>s</i>", m)
    m = re.sub(r"\^\{(\d+)\}\\(?:rm|textrm|mathrm)\s*\{?\s*([A-Z][a-z]?)\}?", r"<sup>\1</sup>\2", m)
    m = re.sub(r"\^\{?(\d+)\}?\s*([A-Z][a-z]?)", r"<sup>\1</sup>\2", m)
    m = re.sub(r"\\textrm\{([^}]*)\}|\\rm\s*\{?([A-Za-z]+)\}?", lambda x: x.group(1) or x.group(2), m)
    m = re.sub(r"K\^\{0\}_\{\\rm S\}", "K<sup>0</sup><sub>S</sub>", m)
    m = re.sub(r"\^\{?([0-9+\-]+)\}?", r"<sup>\1</sup>", m)
    m = re.sub(r"\\(" + "|".join(GREEK) + r")\b\s*", lambda x: GREEK[x.group(1)], m)
    m = m.replace("\\,", " ").replace("~", " ").replace("{", "").replace("}", "")
    m = m.replace("\\", "")
    if m in ("pp",):
        return "pp"
    return m


def clean(s):
    s = s.replace("{\\ensuremath{\\alpha}}", "$\\alpha$")
    for cmd in ("textbf", "emph", "textit", "mathrm", "ensuremath"):
        s = strip_cmd(s, cmd)
    s = re.sub(r"\\textcolor\{[^}]*\}", "", s)
    s = re.sub(r"\\color\{[^}]*\}", "", s)
    s = re.sub(r"\$([^$]*)\$", lambda x: math_to_html(x.group(1)), s)
    repl = {
        "{\\textendash}": "–", "\\textendash{}": "–", "{\\textemdash}": "—",
        "--": "–", "``": "", "''": "", "“": "", "”": "", "\"": "",
        "\\'{c}": "ć", "{\\'c}": "ć", "{\\\"o}": "ö", "\\\"o": "ö", "\\\"{o}": "ö",
        "ﬂ": "fl", "ﬃ": "ffi", "ﬁ": "fi", "\\bf": "", "\\&": "&",
    }
    for a, b in repl.items():
        s = s.replace(a, b)
    s = re.sub(r"(?<=[A-Za-z.])~(?=\S)", " ", s)
    s = s.replace("~", " ")
    s = s.replace("{", "").replace("}", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_item(raw, section):
    for a in ('{\\"o}', '\\"{o}', '\\"o'):
        raw = raw.replace(a, "ö")
    links = []
    for m in re.finditer(r"\\href\{([^}]*)\}\{", raw):
        text, _ = balanced(raw, m.end() - 1)
        links.append((m.group(1).strip(), clean(text)))
    # Title: first quoted chunk.
    t = re.search(r"(?:``|“|\")(.+?)(?:''|”|\")", raw, re.S)
    title = clean(t.group(1)).rstrip(",.") if t else ""
    authors = clean(raw[: t.start()] if t else raw).rstrip(",. ")
    authors = authors.replace("Menon.", "Menon").replace(" ,", ",")
    doi = next((u for u, _ in links if "doi.org" in u), None)
    arxiv = next((u for u, _ in links if "arxiv.org" in u), None)
    venue_link = next(((u, txt) for u, txt in links if "arxiv.org" not in u), None)
    venue = venue_link[1] if venue_link else ""
    if section == "conference" and not venue:
        venue = ""
    year = None
    m = re.search(r"\((20\d\d)\)", venue) or re.search(r"\((20\d\d)\)", raw)
    if m:
        year = int(m.group(1))
    elif arxiv:
        a = re.search(r"(\d\d)(\d\d)\.\d+", arxiv)
        if a:
            year = 2000 + int(a.group(1))
    return {
        "section": section,
        "title": title,
        "authors": authors,
        "venue": venue.rstrip(".,"),
        "year": year,
        "url": venue_link[0] if venue_link else arxiv,
        "doi": doi,
        "arxiv": arxiv.rsplit("/", 1)[-1] if arxiv else None,
        "review": "Review" in raw,
        "first_author": authors.startswith("S. Prasad"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(ROOT.parent / "Latex/CV-Suraj/publications.tex"))
    ap.add_argument("--output", default=str(ROOT / "scripts/publications_data.js"))
    args = ap.parse_args()

    tex = Path(args.input).read_text(encoding="utf-8")
    tex = "\n".join(l for l in tex.splitlines() if not l.lstrip().startswith("%"))
    sections = [
        ("published", r"I\. Published"),
        ("submitted", r"II\. Submitted"),
        ("conference", r"B\.\s+Conference Proceedings"),
    ]
    starts = []
    for key, pat in sections:
        m = re.search(pat, tex)
        if m:
            starts.append((m.start(), key))
    starts.sort()
    records = []
    for idx, (pos, key) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(tex)
        chunk = tex[pos:end]
        chunk = chunk.split("\\end{enumerate}")[0]
        for item in re.split(r"\\item\s", chunk)[1:]:
            item = re.sub(r"\\impactfactor\{[^}]*\}", "", item)
            rec = parse_item(item.strip(), key)
            if rec["title"]:
                records.append(rec)

    payload = {"updated": date.today().isoformat(), "records": records}
    Path(args.output).write_text(
        "window.PUBLICATIONS = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    counts = {k: sum(r["section"] == k for r in records) for k, _ in sections}
    print(f"Wrote {len(records)} records to {args.output}: {counts}")


if __name__ == "__main__":
    main()
