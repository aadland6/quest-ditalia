#!/usr/bin/env python3
"""Merge the Italian question banks into question_bank/italian_bank.json.

Sources:
  app/data/bank_{A1,A2,B1,B2}.json   -- 5,011 items, unified 10-format schema
                                        (run build/wire_audio.py first so
                                        prompt.audio_ref points at real clips)
  italian_game/js/data/bank_{a1,a2,b1}.js -- 2,223 items (mc/cloze/error),
                                        converted to formats 12/4/6, id prefix MG-

Also copies app/media/audio/ -> game/media/audio/ so the PWA is self-contained
(audio_ref paths are relative to game/index.html and stay "media/audio/...").

The merged bank is the AUTHOR-side artifact: it keeps topic/thematic_group/domain
for srs/build_italian_index.py; game/tools/shard_bank.py strips it down to the
learner fields for the runtime shards.
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # italian_resources/
APP = ROOT / "app"
IG = ROOT / "italian_game" / "js" / "data"
OUT = ROOT / "question_bank" / "italian_bank.json"

DOMAIN_LABEL = {
    "vocabulary": "Vocabolario",
    "grammar": "Grammatica",
    "reading": "Lettura",
    "phonology": "Fonologia",
}

# italian_game vocab topics belong with vocabulary; everything else is grammar.
IG_VOCAB_TOPICS = {"vocabolario-nomi", "vocabolario-verbi"}
IG_FORMAT = {"mc": 12, "cloze": 4, "error": 6}


def content_area(domain: str, level: str) -> str:
    label = DOMAIN_LABEL[domain]
    if domain == "phonology":
        return "Fonologia"                 # small; one shard across levels
    return f"{label} {level}"


def load_app_items():
    items = []
    for lv in ["A1", "A2", "B1", "B2"]:
        for it in json.loads((APP / "data" / f"bank_{lv}.json").read_text()):
            it = dict(it)
            it["content_area"] = content_area(it["domain"], it["cefr_level"])
            items.append(it)
    return items


def parse_js_bank(path: Path):
    src = path.read_text()
    return json.loads(src[src.index("["): src.rindex("]") + 1])


def convert_ig_item(q: dict) -> dict:
    domain = "vocabulary" if q["topic"] in IG_VOCAB_TOPICS else "grammar"
    level = q["level"]
    return {
        "id": "MG-" + q["id"],
        "domain": domain,
        "cefr_level": level,
        "frequency_tier": None,
        "thematic_group": "grammatica" if domain == "grammar" else "vocabolario",
        "topic": q["topic"],               # feeds the KC index builder
        "format": IG_FORMAT[q["type"]],
        "audio": "silent",
        "difficulty": "core",
        "prompt": {
            "text": q.get("q_it"),
            "text_en": q.get("q_en"),
            "emoji": None,
            "audio_ref": None,
            "sentence": q.get("sentence"),
        },
        "options": q["options"],
        "tiles": None,
        "correct": [q["correct"]],
        "sort_map": None,
        "explanation": q.get("explain_en", ""),
        "italian": None,
        "content_area": content_area(domain, level),
    }


def load_ig_items():
    items = []
    for f in ["a1", "a2", "b1"]:
        for q in parse_js_bank(IG / f"bank_{f}.js"):
            items.append(convert_ig_item(q))
    return items


def validate(items):
    seen = set()
    problems = []
    for it in items:
        if it["id"] in seen:
            problems.append(f"duplicate id {it['id']}")
        seen.add(it["id"])
        fmt = it["format"]
        p = it["prompt"]
        if fmt in (3, 4, 6, 9, 10, 12) and it["correct"] and not it.get("tiles"):
            for c in it["correct"]:
                if not (0 <= c < len(it["options"])):
                    problems.append(f"{it['id']}: correct index {c} out of range")
        if fmt in (7, 8):
            if not it.get("tiles"):
                problems.append(f"{it['id']}: format {fmt} without tiles")
            else:
                for c in it["correct"]:
                    if not (0 <= c < len(it["tiles"])):
                        problems.append(f"{it['id']}: tile index {c} out of range")
        if fmt == 5 and not it.get("sort_map"):
            problems.append(f"{it['id']}: format 5 without sort_map")
        ref = p.get("audio_ref")
        if ref and not (APP / ref).exists():
            problems.append(f"{it['id']}: audio_ref missing on disk: {ref}")
    return problems


def copy_audio():
    src, dst = APP / "media" / "audio", ROOT / "game" / "media" / "audio"
    dst.mkdir(parents=True, exist_ok=True)
    n = 0
    for f in src.rglob("*"):
        if f.is_file():
            rel = f.relative_to(src)
            target = dst / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists() or target.stat().st_mtime < f.stat().st_mtime:
                shutil.copy2(f, target)
            n += 1
    return n


def main():
    app_items = load_app_items()
    ig_items = load_ig_items()
    items = app_items + ig_items
    problems = validate(items)
    if problems:
        for p in problems[:20]:
            print("PROBLEM:", p)
        raise SystemExit(f"{len(problems)} validation problems")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, ensure_ascii=False))
    n_audio = copy_audio()

    from collections import Counter
    areas = Counter(i["content_area"] for i in items)
    fmts = Counter(i["format"] for i in items)
    wired = sum(1 for i in items if i["prompt"].get("audio_ref"))
    print(f"bank: {len(items)} items ({len(app_items)} app + {len(ig_items)} italian_game)")
    print(f"audio: {wired} items with native clips; {n_audio} files copied to game/media/audio")
    print("areas:", dict(sorted(areas.items())))
    print("formats:", dict(sorted(fmts.items())))


if __name__ == "__main__":
    main()
