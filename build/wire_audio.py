#!/usr/bin/env python3
"""Phase 1 wiring — consume build/audio_cache.json + media_manifest.json and:
  - set prompt.audio_ref + audio='enhanced' on every matched item in app/data/bank_*.json
  - update media_manifest.json asset status/source/license/ext
  - write app/media/audio/ATTRIBUTIONS.md + build/deliverables/audio_credits.json
  - write build/deliverables/audio_gap_report.json
  - update build/deliverables/coverage_ledger.json
Idempotent: safe to re-run after more fetching.
"""
import json, os, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "build/deliverables/media_manifest.json")
CACHE = os.path.join(ROOT, "build/audio_cache.json")
DELIV = os.path.join(ROOT, "build/deliverables")

def load(p): return json.load(open(p))
def dump(o, p): json.dump(o, open(p, "w"), ensure_ascii=False, indent=1)

def main():
    manifest = load(MANIFEST)
    cache = load(CACHE)
    assets = [a for a in manifest["assets"] if a.get("type") == "audio"]

    # lemma -> list of item ids
    lemma_items = {}
    lemma_asset = {}
    for a in assets:
        lemma = a["path"].split("/")[-1].rsplit(".", 1)[0]
        lemma_items[lemma] = a.get("for_item_ids", [])
        lemma_asset[lemma] = a

    # item id -> audio_ref (only for found lemmas)
    item_ref = {}
    for lemma, c in cache.items():
        if c.get("found") and c.get("audio_ref"):
            for iid in lemma_items.get(lemma, []):
                item_ref[iid] = c["audio_ref"]

    # ---- update banks ----
    wired = 0
    for f in glob.glob(os.path.join(ROOT, "app/data/bank_*.json")):
        d = load(f)
        items = d if isinstance(d, list) else d["items"]
        changed = False
        for it in items:
            ref = item_ref.get(it["id"])
            if ref:
                it.setdefault("prompt", {})["audio_ref"] = ref
                if it.get("audio") != "enhanced":
                    it["audio"] = "enhanced"
                wired += 1; changed = True
        if changed:
            dump(d, f)
    print(f"wired audio_ref onto {wired} items")

    # ---- update manifest ----
    found = miss = 0
    for a in assets:
        lemma = a["path"].split("/")[-1].rsplit(".", 1)[0]
        c = cache.get(lemma, {})
        if c.get("found"):
            found += 1
            a["status"] = "produced"
            a["path"] = c["audio_ref"].replace("media/audio", "media/audio")  # already app-relative
            a["source"] = c["source"]
            a["commons_title"] = c["commons_title"]
            a["license"] = c["license"]
            a["speaker"] = c.get("artist")
        elif c.get("done"):
            miss += 1
            a["status"] = "no_free_native_source"
            a["fallback"] = "runtime_tts_it-IT"
    dump(manifest, MANIFEST)
    print(f"manifest: produced={found} missing={miss}")

    # ---- attributions ----
    credits = []
    seen = set()
    for lemma, c in cache.items():
        if not c.get("found") or lemma in seen:
            continue
        seen.add(lemma)
        credits.append({
            "lemma": lemma, "file": os.path.basename(c["audio_ref"]),
            "audio_ref": c["audio_ref"], "source": c["source"],
            "commons_title": c["commons_title"], "commons_url": c["commons_url"],
            "author_speaker": " ".join((c.get("artist") or "").split()),  # collapse newlines/space
            "license": c["license"],
        })
    credits.sort(key=lambda x: x["lemma"])
    dump(credits, os.path.join(DELIV, "audio_credits.json"))

    by_lic = collections.Counter(c["license"] or "unknown" for c in credits)
    by_src = collections.Counter(c["source"] for c in credits)
    lines = [
        "# Audio attributions — native Italian pronunciation clips",
        "",
        "All clips below were downloaded from **Wikimedia Commons** (Lingua Libre + Wiktionary "
        "pronunciation projects) and are reused here under their respective free licenses. "
        "Lingua Libre WAV sources were transcoded to AAC (`.m4a`, 48 kHz mono) with macOS "
        "`afconvert`; Wiktionary Ogg Vorbis clips are used as-is.",
        "",
        f"- Total clips: **{len(credits)}**",
        f"- By source: " + ", ".join(f"{k} {v}" for k, v in by_src.most_common()),
        f"- By license: " + ", ".join(f"{k} {v}" for k, v in by_lic.most_common()),
        "",
        "**Share-alike note:** CC BY-SA clips require attribution and keep their license if "
        "redistributed. Attribution for each file is its Commons page (linked below), which names "
        "the speaker/author and exact license.",
        "",
        "| Word | File | Source | License | Speaker/Author | Commons page |",
        "|---|---|---|---|---|---|",
    ]
    for c in credits:
        sp = (c["author_speaker"] or "").replace("|", "/")[:40]
        lines.append(f"| {c['lemma']} | `{c['file']}` | {c['source']} | {c['license']} "
                     f"| {sp} | [link]({c['commons_url']}) |")
    open(os.path.join(ROOT, "app/media/audio/ATTRIBUTIONS.md"), "w").write("\n".join(lines) + "\n")
    print(f"wrote ATTRIBUTIONS.md + audio_credits.json ({len(credits)} clips)")

    # ---- gap report ----
    gaps = []
    for lemma, c in cache.items():
        if c.get("done") and not c.get("found"):
            gaps.append({"lemma": lemma, "category": c.get("category"),
                         "record_text": lemma_asset.get(lemma, {}).get("record_text"),
                         "fallback": "runtime_tts_it-IT"})
    gaps.sort(key=lambda x: (x["category"] or "", x["lemma"]))
    dump({"count": len(gaps), "note": "no free native clip on Commons; app uses it-IT Web Speech "
          "TTS at runtime", "items": gaps}, os.path.join(DELIV, "audio_gap_report.json"))

    # ---- coverage by category ----
    tot = collections.Counter()
    hit = collections.Counter()
    for lemma in lemma_items:
        cat = lemma_asset[lemma]["path"].split("/")[2] if "/" in lemma_asset[lemma]["path"] else "?"
        # recompute category robustly from cache
        cat = cache.get(lemma, {}).get("category", cat)
        tot[cat] += 1
        if cache.get(lemma, {}).get("found"):
            hit[cat] += 1
    coverage = {c: {"native": hit[c], "total": tot[c],
                    "pct": round(100 * hit[c] / tot[c]) if tot[c] else 0}
                for c in sorted(tot)}
    overall = {"native": sum(hit.values()), "total": sum(tot.values()),
               "pct": round(100 * sum(hit.values()) / sum(tot.values())) if tot else 0,
               "tts_fallback": sum(tot.values()) - sum(hit.values())}
    ledger = {}
    lp = os.path.join(DELIV, "coverage_ledger.json")
    if os.path.exists(lp):
        try: ledger = load(lp)
        except Exception: ledger = {}
    ledger["audio_native"] = {"overall": overall, "by_category": coverage}
    dump(ledger, lp)
    print(f"coverage: native {overall['native']}/{overall['total']} = {overall['pct']}% "
          f"(+{overall['tts_fallback']} runtime-TTS)")
    print("gap report:", len(gaps), "lemmas")

if __name__ == "__main__":
    main()
