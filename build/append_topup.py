#!/usr/bin/env python3
"""Append validated top-up items to the SHIPPED chunks (preserving prior fixes),
then rewrite index.json and regenerate media_manifest. Dedupes against existing."""
import json, os, sys, glob, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_bank import check, signature, LEVELS, PREFIX, slug

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "app", "data")
DELIV = os.path.join(ROOT, "build", "deliverables")
TOPUP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "build", "items", "topup_vocab.json")

def main():
    chunks = {lv: json.load(open(os.path.join(DATA, f"bank_{lv}.json"), encoding="utf-8")) for lv in LEVELS}
    seen = set()
    maxnum = {}
    for lv in LEVELS:
        for it in chunks[lv]:
            seen.add(signature(it))
            m = re.match(r"([A-Z]+)-([A-Z0-9]+)-(\d+)", it["id"])
            if m:
                k = (m.group(1), m.group(2)); maxnum[k] = max(maxnum.get(k, 0), int(m.group(3)))

    new = json.load(open(TOPUP, encoding="utf-8"))
    added, skipped_dup, skipped_bad = 0, 0, 0
    for it in new:
        ok, reason = check(it)
        if not ok: skipped_bad += 1; continue
        sig = signature(it)
        if sig in seen: skipped_dup += 1; continue
        seen.add(sig)
        lv = it["cefr_level"]; pfx = PREFIX[it["domain"]]
        maxnum[(pfx, lv)] = maxnum.get((pfx, lv), 0) + 1
        it["id"] = f"{pfx}-{lv}-{maxnum[(pfx,lv)]:06d}"
        for k in ("frequency_tier","sort_map","tiles","review_flag"): it.setdefault(k, None)
        it.setdefault("options", []); it.setdefault("correct", []); it.setdefault("distractor_rationales", [])
        chunks[lv].append(it); added += 1

    for lv in LEVELS:
        json.dump(chunks[lv], open(os.path.join(DATA, f"bank_{lv}.json"), "w", encoding="utf-8"), ensure_ascii=False)

    # rewrite index.json
    index = {"levels": LEVELS,
             "chunks": {lv: f"bank_{lv}.json" for lv in LEVELS},
             "counts": {lv: len(chunks[lv]) for lv in LEVELS},
             "ids": {lv: [x["id"] for x in chunks[lv]] for lv in LEVELS},
             "total": sum(len(chunks[lv]) for lv in LEVELS), "schema": "impara-v1"}
    json.dump(index, open(os.path.join(DATA, "index.json"), "w", encoding="utf-8"), ensure_ascii=False)

    # regenerate media manifest (desired audio per unique lemma across all chunks)
    manifest, seen_lemma = [], set()
    for lv in LEVELS:
        for x in chunks[lv]:
            it = x.get("italian") or {}; lemma = it.get("lemma")
            if not lemma or lemma in seen_lemma: continue
            seen_lemma.add(lemma)
            art = it.get("article"); rec = (art + " " if art else "") + lemma
            manifest.append({"path": f"media/audio/{x.get('thematic_group','misc')}/{slug(lemma)}.opus", "type": "audio",
                "for_item_ids": [x["id"]], "record_text": rec,
                "voice_note": "native speaker; multiple speakers for phonology/minimal-pair", "image_concept": None,
                "spec": "Opus ~48kbps mono", "status": "to_produce"})
    json.dump({"assets": manifest, "note": "Emoji cues need no asset; only audio listed. All to_produce (silent-first build)."},
              open(os.path.join(DELIV, "media_manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"Added {added} | dup skipped {skipped_dup} | invalid skipped {skipped_bad}")
    print("New counts:", index["counts"], "| TOTAL:", index["total"])
    print("Media assets desired:", len(manifest))

if __name__ == "__main__":
    main()
