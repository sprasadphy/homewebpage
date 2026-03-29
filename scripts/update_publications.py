#!/usr/bin/env python3
"""
Regenerate local publications dataset for the static website.

Default behavior:
- Fetches all records from INSPIRE for recid 1945401.
- Keeps only records with <=10 authors for local browsing.
- Writes compact JSON to data/publications.json.

Usage:
  python scripts/update_publications.py
  python scripts/update_publications.py --recid 1945401 --max-authors 10 --output data/publications.json
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update local INSPIRE publication cache.")
    parser.add_argument("--recid", default="1945401", help="INSPIRE author recid.")
    parser.add_argument(
        "--max-authors",
        type=int,
        default=10,
        help="Keep records with this many authors or fewer.",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=250,
        help="INSPIRE page size per API call.",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=40,
        help="Safety cap on paginated API calls.",
    )
    parser.add_argument(
        "--output",
        default="data/publications.json",
        help="Output JSON path.",
    )
    return parser.parse_args()


def fetch_json(url: str, timeout: int = 60) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_all_records(recid: str, page_size: int, max_pages: int) -> list[dict[str, Any]]:
    query = quote(f"authors.recid:{recid}")
    fields = (
        "titles,earliest_date,preprint_date,publication_info,document_type,"
        "authors,refereed,dois,arxiv_eprints,links"
    )
    next_url = (
        "https://inspirehep.net/api/literature?"
        f"q={query}&sort=mostrecent&size={page_size}&page=1&fields={quote(fields)}"
    )

    records: list[dict[str, Any]] = []
    page = 0

    while next_url and page < max_pages:
        page += 1
        payload = fetch_json(next_url)
        hits = payload.get("hits", {}).get("hits", [])
        if not isinstance(hits, list):
            hits = []

        for record in hits:
            if isinstance(record, dict):
                records.append(record)

        next_link = payload.get("links", {}).get("next", "")
        next_url = next_link if isinstance(next_link, str) else ""

    return records


def compact_record(record: dict[str, Any], max_authors: int) -> dict[str, Any] | None:
    metadata = record.get("metadata", {}) if isinstance(record.get("metadata"), dict) else {}
    author_list = metadata.get("authors", []) if isinstance(metadata.get("authors"), list) else []
    author_count = len(author_list)
    if author_count == 0 or author_count > max_authors:
        return None

    compact_authors = []
    for author in author_list[:6]:
        if not isinstance(author, dict):
            continue
        ref = None
        author_record = author.get("record")
        if isinstance(author_record, dict):
            ref = author_record.get("$ref")
        compact_authors.append(
            {
                "full_name": author.get("full_name"),
                "record": {"$ref": ref} if isinstance(ref, str) and ref else None,
            }
        )

    publication_info = metadata.get("publication_info", [])
    compact_pub_info = []
    if isinstance(publication_info, list) and publication_info:
        primary = publication_info[0] if isinstance(publication_info[0], dict) else {}
        compact_pub_info.append(
            {
                "journal_title": primary.get("journal_title"),
                "conference_title": primary.get("conference_title"),
                "book_title": primary.get("book_title"),
            }
        )

    titles = metadata.get("titles", [])
    compact_titles = []
    if isinstance(titles, list) and titles:
        first_title = titles[0] if isinstance(titles[0], dict) else {}
        compact_titles.append({"title": first_title.get("title")})

    dois = metadata.get("dois", [])
    compact_dois = []
    if isinstance(dois, list) and dois:
        first_doi = dois[0] if isinstance(dois[0], dict) else {}
        compact_dois.append({"value": first_doi.get("value")})

    arxiv_eprints = metadata.get("arxiv_eprints", [])
    compact_arxiv = []
    if isinstance(arxiv_eprints, list) and arxiv_eprints:
        first_arxiv = arxiv_eprints[0] if isinstance(arxiv_eprints[0], dict) else {}
        compact_arxiv.append({"value": first_arxiv.get("value")})

    links = record.get("links", {}) if isinstance(record.get("links"), dict) else {}

    return {
        "id": record.get("id"),
        "links": {"self": links.get("self")},
        "metadata": {
            "titles": compact_titles,
            "earliest_date": metadata.get("earliest_date"),
            "preprint_date": metadata.get("preprint_date"),
            "publication_info": compact_pub_info,
            "document_type": metadata.get("document_type") if isinstance(metadata.get("document_type"), list) else [],
            "author_count": author_count,
            "authors": compact_authors,
            "refereed": bool(metadata.get("refereed")),
            "dois": compact_dois,
            "arxiv_eprints": compact_arxiv,
        },
    }


def main() -> None:
    args = parse_args()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fetched = fetch_all_records(args.recid, args.page_size, args.max_pages)
    compacted: list[dict[str, Any]] = []
    for record in fetched:
        compact = compact_record(record, args.max_authors)
        if compact is not None:
            compacted.append(compact)

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "source": f"INSPIRE-HEP authors.recid:{args.recid}",
        "policy": f"local dataset stores records with {args.max_authors} authors or fewer",
        "records": compacted,
    }

    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=True, separators=(",", ":"))

    print(f"Fetched records: {len(fetched)}")
    print(f"Stored local records (<= {args.max_authors} authors): {len(compacted)}")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
