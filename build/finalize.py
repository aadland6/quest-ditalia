#!/usr/bin/env python3
"""Post-fix finalize: re-validate shipped chunks, regenerate ledger/review from app/data."""
import json, os, glob, sys
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_bank import check, LEVELS  # reuse structural validator

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "app", "data")
DELIV = os.path.join(ROOT, "build", "deliverables")

def main():
    items = []
    for lv in LEVELS:
        items += json.load(open(os.path.join(DATA, f"bank_{lv}.json"), encoding="utf-8"))
    print(f"Loaded {len(items)} shipped items")

    # 1) structural re-validation
    bad = [(it["id"], check(it)[1]) for it in items if not check(it)[0]]
    # 2) duplicate-option-equals-key scan (the fixer's target bug)
    dup_key = []
    for it in items:
        opts = it.get("options") or []
        if opts and len(set(opts)) < len(opts):
            # a duplicate exists; flag if it duplicates the keyed answer
            corr = it.get("correct") or []
            if corr and isinstance(corr[0], int) and 0 <= corr[0] < len(opts):
                key = opts[corr[0]]
                if opts.count(key) > 1:
                    dup_key.append(it["id"])
    # 3) review flags
    flagged = [{"id": it["id"], "reason": it["review_flag"]} for it in items if it.get("review_flag")]

    print(f"Structural failures: {len(bad)}")
    for i, r in bad[:20]: print("   ", i, r)
    print(f"Duplicate-option-equals-key remaining: {len(dup_key)}")
    for i in dup_key[:20]: print("   ", i)
    print(f"Items with review_flag: {len(flagged)}")

    # regenerate ledger
    ledger = {"total": len(items), "by_level": dict(Counter(x["cefr_level"] for x in items)),
              "by_domain": dict(Counter(x["domain"] for x in items)),
              "by_format": {str(k): v for k, v in sorted(Counter(x["format"] for x in items).items())},
              "by_level_domain": {}, "silent_ratio_by_level": {},
              "audio_dist": dict(Counter(x["audio"] for x in items)),
              "qa": {"structural_failures": len(bad), "duplicate_option_bugs_remaining": len(dup_key),
                     "review_flagged": len(flagged)}}
    for lv in LEVELS:
        sub = [x for x in items if x["cefr_level"] == lv]
        ledger["by_level_domain"][lv] = dict(Counter(x["domain"] for x in sub))
        silent = sum(1 for x in sub if x["audio"] in ("silent", "enhanced"))
        ledger["silent_ratio_by_level"][lv] = round(silent/len(sub), 3) if sub else None
    json.dump(ledger, open(os.path.join(DELIV, "coverage_ledger.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    json.dump(flagged, open(os.path.join(DELIV, "review_queue.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print("Rewrote coverage_ledger.json + review_queue.json")
    print("By level:", ledger["by_level"], "| By domain:", ledger["by_domain"])

if __name__ == "__main__":
    main()
