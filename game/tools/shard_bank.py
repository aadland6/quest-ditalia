#!/usr/bin/env python3
"""Shard question_bank/italian_bank.json by content_area into game/data/bank/<slug>.json.

Strips author-only fields (domain, topic, thematic_group, frequency_tier,
distractor_rationales, source, review_flag) to slim the payload; writes
shard_index.json mapping content_area -> {file, count}.
Re-run after regenerating the bank (game/tools/build_bank.py).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # italian_resources/
BANK = ROOT / "question_bank" / "italian_bank.json"
OUT = ROOT / "game" / "data" / "bank"

LEARNER_FIELDS = [
    "id", "content_area", "format", "difficulty", "cefr_level",
    "prompt", "options", "tiles", "correct", "sort_map", "explanation", "italian",
]


def slug(area: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", area.lower()).strip("-")


def main():
    bank = json.loads(BANK.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()                       # drop stale shards from prior banks
    shards = {}
    for item in bank:
        trimmed = {k: item.get(k) for k in LEARNER_FIELDS}
        shards.setdefault(item["content_area"], []).append(trimmed)

    index = {}
    total_bytes = 0
    for area, items in sorted(shards.items()):
        fname = slug(area) + ".json"
        path = OUT / fname
        path.write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")))
        size = path.stat().st_size
        total_bytes += size
        index[area] = {"file": fname, "count": len(items)}
        print(f"{fname:45s} {len(items):5d} items  {size/1024:8.1f} KB")

    (OUT / "shard_index.json").write_text(json.dumps(index, indent=1))
    print(f"\n{len(shards)} shards, {len(bank)} items, {total_bytes/1024/1024:.2f} MB total")


if __name__ == "__main__":
    main()
