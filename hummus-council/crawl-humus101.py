"""Fetch the public restaurant category without crawling comments or images.

Usage from Public-html-pages:
  python hummus-council/crawl-humus101.py --output .amp/in/humus101

The output contains full article HTML for local research, not republication.
Only index.json (titles, dates and original links) is suitable for publication.
An existing output directory is not overwritten. No automatic retries.
"""

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

BASE = "https://humus101.com"
AGENT = "HummusCouncilResearch/1.0"
SLUG = "%d7%97%d7%95%d7%9e%d7%95%d7%a1%d7%99%d7%95%d7%aa"


def crawl(output):
    output.mkdir(parents=True, exist_ok=False)
    robots = RobotFileParser(BASE + "/robots.txt")
    with urlopen(
        Request(robots.url, headers={"User-Agent": AGENT}), timeout=30
    ) as response:
        rules = response.read().decode("utf-8")
    robots.parse(rules.splitlines())
    delay = max(2, robots.crawl_delay(AGENT) or 0)

    def get(path, params):
        url = BASE + path + "?" + urlencode(params)
        if not robots.can_fetch(AGENT, url):
            raise RuntimeError("robots.txt disallows " + url)
        time.sleep(delay)
        with urlopen(
            Request(url, headers={"User-Agent": AGENT}), timeout=60
        ) as response:
            return json.load(response), response.headers

    categories, _ = get(
        "/wp-json/wp/v2/categories",
        {"slug": "חומוסיות", "_fields": "id,count,link,name"},
    )
    if len(categories) != 1:
        raise RuntimeError("Expected exactly one restaurant category")
    category = categories[0]
    posts = []
    page = 1
    while True:
        batch, headers = get(
            "/wp-json/wp/v2/posts",
            {
                "categories": category["id"],
                "per_page": 100,
                "page": page,
                "orderby": "date",
                "order": "desc",
                "_fields": "id,date,modified,link,title,content,categories",
            },
        )
        total = int(headers["X-WP-Total"])
        pages = int(headers["X-WP-TotalPages"])
        if total != category["count"] or any(
            category["id"] not in post["categories"] for post in batch
        ):
            raise RuntimeError(
                "Category changed during crawl or returned unexpected posts"
            )
        posts.extend(batch)
        print(f"Fetched batch {page}/{pages}: {len(posts)}/{total} posts", flush=True)
        if page == pages:
            break
        page += 1
    if len(posts) != total or len({post["id"] for post in posts}) != total:
        raise RuntimeError("Incomplete crawl or duplicate post IDs")
    (output / "posts.json").write_text(
        json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    index = {
        "source": BASE + "/category/" + SLUG,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "method": "Public WordPress REST API, category 6, 100 posts per batch, minimum 2 seconds between requests",
        "expectedPosts": total,
        "fetchedPosts": len(posts),
        "complete": True,
        "note": "Article index, not a list of open restaurants. Posts can be closures, roundups, repeat visits or historical reviews. Full article bodies, comments and images are not published here.",
        "posts": [
            {
                "id": p["id"],
                "title": p["title"]["rendered"],
                "date": p["date"],
                "modified": p["modified"],
                "url": p["link"],
            }
            for p in posts
        ],
    }
    (output / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Verified {total} unique posts. Research snapshot: {output.resolve()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    crawl(parser.parse_args().output)
