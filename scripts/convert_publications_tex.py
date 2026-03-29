#!/usr/bin/env python3
"""
Convert CV LaTeX publications file into webpage-ready data.

Input (default):  ../Latex/CV-Suraj/publications.tex
Outputs:
  - data/publications_from_tex.json
  - scripts/publications_data.js  (window.PUBLICATIONS_TEX_DATA)
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert publications.tex to website data files.")
    parser.add_argument(
        "--input",
        default="../Latex/CV-Suraj/publications.tex",
        help="Path to publications.tex relative to webpage root.",
    )
    parser.add_argument(
        "--json-output",
        default="data/publications_from_tex.json",
        help="Output JSON path.",
    )
    parser.add_argument(
        "--js-output",
        default="scripts/publications_data.js",
        help="Output JS path containing window.PUBLICATIONS_TEX_DATA.",
    )
    return parser.parse_args()


def strip_tex_markup(text: str) -> tuple[str, str | None, str | None]:
    link_url = None
    link_label = None

    def repl_href(match: re.Match[str]) -> str:
        nonlocal link_url, link_label
        url = match.group(1).strip()
        label = match.group(2).strip()
        if link_url is None:
            link_url = url
            link_label = label
        return label

    text = re.sub(r"\\href\{([^}]*)\}\{([^}]*)\}", repl_href, text)
    text = re.sub(r"\\url\{([^}]*)\}", r"\1", text)
    text = re.sub(r"\\textbf\{([^}]*)\}", r"\1", text)
    text = re.sub(r"\\emph\{([^}]*)\}", r"\1", text)
    text = re.sub(r"\{\\bf\s+([^}]*)\}", r"\1", text)

    text = text.replace("\\textendash{}", "-")
    text = text.replace("\\textendash", "-")
    text = text.replace("\\&", "&")
    text = text.replace("\\%", "%")
    text = text.replace("\\_", "_")
    text = text.replace("\"", '"')

    # Normalize TeX quotes while keeping content.
    text = text.replace("``", '"').replace("''", '"')
    text = text.replace("“", '"').replace("”", '"')

    # Remove braces that are not needed for rendering.
    text = text.replace("{", "").replace("}", "")

    # Compact whitespace.
    text = re.sub(r"\s+", " ", text).strip()

    return text, link_url, link_label


def extract_title(cleaned: str) -> str:
    quote_match = re.search(r'"([^"]{8,}?)"', cleaned)
    if quote_match:
        return quote_match.group(1).strip()

    # Fallback: first sentence chunk.
    return cleaned[:180].strip(" .,")


def extract_authors(cleaned: str, title: str) -> list[dict[str, str]]:
    if title and (f'"{title}"' in cleaned):
        prefix = cleaned.split(f'"{title}"', 1)[0]
    else:
        prefix = cleaned

    prefix = prefix.strip(" ,.-")
    if not prefix:
        return []

    # Split on commas and ' and '.
    chunks = re.split(r",|\band\b", prefix)
    authors = []
    for chunk in chunks:
        name = chunk.strip(" .")
        if not name:
            continue
        # Drop short non-name tokens.
        if len(name) < 2:
            continue
        authors.append({"full_name": name})

    # Avoid pathological over-splitting.
    if len(authors) > 25:
        return []

    return authors


def classify_year(text: str) -> str | None:
    year_match = re.search(r"(19|20)\d{2}", text)
    return year_match.group(0) if year_match else None


def build_record(item_text: str, section: str, index: int) -> dict[str, Any]:
    cleaned, link_url, link_label = strip_tex_markup(item_text)
    title = extract_title(cleaned)
    authors = extract_authors(cleaned, title)

    if section == "conference":
        doc_type = ["conference paper"]
    else:
        doc_type = ["article"]

    refereed = section != "communicated"

    year = classify_year(link_label or cleaned)
    earliest_date = f"{year}-01-01" if year else None

    venue = (link_label or "").strip()

    dois = []
    arxiv = []
    if link_url:
        if "doi.org/" in link_url:
            dois.append({"value": link_url.split("doi.org/", 1)[1]})
        if "arxiv.org/abs/" in link_url:
            arxiv.append({"value": link_url.split("arxiv.org/abs/", 1)[1]})

    return {
        "id": f"tex-{section}-{index}",
        "links": {"self": link_url or ""},
        "metadata": {
            "titles": [{"title": title}],
            "earliest_date": earliest_date,
            "preprint_date": earliest_date,
            "publication_info": [{"journal_title": venue}],
            "document_type": doc_type,
            "author_count": len(authors),
            "authors": authors[:12],
            "refereed": refereed,
            "dois": dois,
            "arxiv_eprints": arxiv,
            "section": section,
            "raw_text": cleaned,
        },
    }


def split_items(block: str) -> list[str]:
    items = []
    for match in re.finditer(r"\\item\s+(.*?)(?=(\\item|$))", block, flags=re.DOTALL):
        text = match.group(1).strip()
        if text:
            items.append(text)
    return items


def parse_publications_tex(tex_text: str) -> list[dict[str, Any]]:
    # Remove pure comments.
    lines = []
    for line in tex_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("%"):
            continue
        lines.append(line)
    tex_text = "\n".join(lines)

    blocks = re.findall(r"\\begin\{enumerate\}(.*?)\\end\{enumerate\}", tex_text, flags=re.DOTALL)
    if len(blocks) < 3:
        raise RuntimeError("Expected at least 3 enumerate blocks in publications.tex")

    published_items = split_items(blocks[0])
    communicated_items = split_items(blocks[1])
    conference_items = split_items(blocks[2])

    records: list[dict[str, Any]] = []
    idx = 0

    for text in published_items:
        idx += 1
        records.append(build_record(text, "published", idx))

    for text in communicated_items:
        idx += 1
        records.append(build_record(text, "communicated", idx))

    for text in conference_items:
        idx += 1
        records.append(build_record(text, "conference", idx))

    return records


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    json_output = Path(args.json_output)
    js_output = Path(args.js_output)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    tex_text = input_path.read_text(encoding="utf-8")
    records = parse_publications_tex(tex_text)

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(input_path),
        "records": records,
    }

    json_output.parent.mkdir(parents=True, exist_ok=True)
    json_output.write_text(json.dumps(payload, ensure_ascii=True, separators=(",", ":")), encoding="utf-8")

    js_output.parent.mkdir(parents=True, exist_ok=True)
    js_output.write_text(
        "window.PUBLICATIONS_TEX_DATA=" + json.dumps(payload, ensure_ascii=True, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )

    print(f"Parsed records: {len(records)}")
    print(f"JSON output: {json_output}")
    print(f"JS output: {js_output}")


if __name__ == "__main__":
    main()
