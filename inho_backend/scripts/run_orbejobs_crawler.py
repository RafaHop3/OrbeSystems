"""
OrbeJobs — Runner Standalone de Varredura Zero-VPS (GitHub Actions + Playwright)
Executa os conectores Greenhouse, Lever, RSS e Playwright e opcionalmente envia para o endpoint de ingestão.
"""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services.orbejobs_scraper import run_hybrid_scrape  # noqa: E402


async def _main() -> int:
    parser = argparse.ArgumentParser(description="OrbeJobs Hybrid ATS & Playwright Crawler")
    parser.add_argument("--greenhouse", default=os.environ.get("ORBEJOBS_GREENHOUSE_BOARDS", ""))
    parser.add_argument("--lever", default=os.environ.get("ORBEJOBS_LEVER_COMPANIES", ""))
    parser.add_argument("--rss", default=os.environ.get("ORBEJOBS_RSS_FEEDS", ""))
    parser.add_argument("--playwright", default=os.environ.get("ORBEJOBS_PLAYWRIGHT_URLS", ""))
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--output", default="orbejobs_scraped.json")
    args = parser.parse_args()

    split_csv = lambda raw: [x.strip() for x in (raw or "").split(",") if x.strip()]
    jobs = await run_hybrid_scrape(
        greenhouse_boards=split_csv(args.greenhouse),
        lever_companies=split_csv(args.lever),
        rss_feeds=split_csv(args.rss),
        playwright_urls=split_csv(args.playwright),
        limit_per_source=args.limit,
    )

    out_path = Path(args.output)
    out_path.write_text(
        json.dumps(jobs, indent=2, default=str, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[OrbeJobs-Crawler] {len(jobs)} vaga(s) deduplicadas salvas em {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
