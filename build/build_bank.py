#!/usr/bin/env python3
"""Merge/validate item JSON -> chunked static bank + deliverables. No external deps."""
import json, glob, os, re, sys, unicodedata, hashlib
from collections import defaultdict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS_DIR = os.path.join(ROOT, "build", "items")
LEX_DIR   = os.path.join(ROOT, "build", "lex")
DATA_DIR  = os.path.join(ROOT, "app", "data")
DELIV     = os.path.join(ROOT, "build", "deliverables")
LEVELS = ["A1", "A2", "B1", "B2"]
ALLOWED_FORMATS = {1,3,4,5,6,7,8,9,10,11}
PREFIX = {"vocabulary":"VOC","grammar":"GRA","phonology":"PHO","reading":"REA"}

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+","-", s.lower()).strip("-") or "x"

def load_arrays(pattern):
    out = []
    for fp in sorted(glob.glob(pattern)):
        try:
            d = json.load(open(fp, encoding="utf-8"))
            if isinstance(d, list): out.extend((fp, x) for x in d)
            elif isinstance(d, dict) and "items" in d: out.extend((fp, x) for x in d["items"])
        except Exception as e:
            print(f"  ! skip {os.path.basename(fp)}: {e}", file=sys.stderr)
    return out

def valid_indices(idxs, n):
    return all(isinstance(i,int) and 0<=i<n for i in idxs)

def check(item):
    """Return (ok, reason). Structural validation only."""
    f = item.get("format")
    if f not in ALLOWED_FORMATS: return False, f"format {f} not shipped"
    if item.get("cefr_level") not in LEVELS: return False, "bad cefr_level"
    if item.get("domain") not in PREFIX: return False, "bad domain"
    if not (item.get("explanation") or "").strip(): return False, "no explanation"
    if item.get("audio") == "required": return False, "audio required (no asset)"
    p = item.get("prompt") or {}
    opts = item.get("options") or []
    corr = item.get("correct") or []
    it = item.get("italian") or {}
    if f == 1:
        if not it.get("lemma"): return False, "flashcard: no lemma"
        if not (p.get("emoji") or p.get("text")): return False, "flashcard: no cue"
    elif f == 3:
        if not (2 <= len(opts) <= 4): return False, "pic-MC: opt count"
        if len(corr)!=1 or not valid_indices(corr,len(opts)): return False, "pic-MC: correct"
        if not (p.get("text") or it.get("lemma")): return False, "pic-MC: no word"
    elif f == 4:
        if not p.get("sentence") or not re.search(r"_{2,}|\bblank\b", p["sentence"], re.I): return False, "cloze: no blank"
        if len(opts) < 2 or len(corr)!=1 or not valid_indices(corr,len(opts)): return False, "cloze: options"
    elif f == 5:
        sm = item.get("sort_map") or {}
        if not sm or not opts: return False, "sort: empty"
        if any(v not in opts for v in sm.values()): return False, "sort: bin mismatch"
    elif f == 6:
        if len(opts) < 2 or len(corr)!=1 or not valid_indices(corr,len(opts)): return False, "errcorr: options"
    elif f == 7:
        if not (p.get("emoji") or p.get("text")): return False, "spelling: no meaning"
        tl = item.get("tiles") or []
        if not tl or not corr or not valid_indices(corr,len(tl)): return False, "spelling: tiles"
    elif f == 8:
        tl = item.get("tiles") or []
        if len(tl) < 2 or not corr or not valid_indices(corr,len(tl)): return False, "build: tiles"
    elif f == 9:
        if not p.get("sentence") or not p.get("text"): return False, "reading: missing"
        if len(opts) < 2 or len(corr)!=1 or not valid_indices(corr,len(opts)): return False, "reading: options"
    elif f == 10:
        if not p.get("text"): return False, "transform: no instr"
        tl = item.get("tiles") or []
        if tl:
            if not corr or not valid_indices(corr,len(tl)): return False, "transform: tiles"
        else:
            if len(opts) < 2 or len(corr)!=1 or not valid_indices(corr,len(opts)): return False, "transform: options"
    elif f == 11:
        if len(opts) < 4: return False, "match: pool"
        if not corr or not all(isinstance(pr,list) and len(pr)==2 and valid_indices(pr,len(opts)) for pr in corr):
            return False, "match: pairs"
        if len(corr) < 2: return False, "match: too few pairs"
    return True, ""

def signature(item):
    p = item.get("prompt") or {}
    key = "|".join([str(item.get("format")), (item.get("italian") or {}).get("lemma","") or "",
                    p.get("text") or "", p.get("sentence") or "", p.get("emoji") or "",
                    "·".join(item.get("options") or [])])
    return hashlib.md5(key.lower().encode()).hexdigest()

def main():
    os.makedirs(DATA_DIR, exist_ok=True); os.makedirs(DELIV, exist_ok=True)
    raw = load_arrays(os.path.join(ITEMS_DIR, "*.json"))
    print(f"Loaded {len(raw)} raw items from {len(set(fp for fp,_ in raw))} files")

    shipped, review, seen_sig = [], [], set()
    dupes = 0
    for fp, item in raw:
        if not isinstance(item, dict): continue
        if item.get("review_flag"):
            review.append({"id":item.get("id"),"reason":item["review_flag"],"format":item.get("format"),"file":os.path.basename(fp)})
            continue
        ok, reason = check(item)
        if not ok:
            review.append({"id":item.get("id"),"reason":reason,"format":item.get("format"),"file":os.path.basename(fp)})
            continue
        sig = signature(item)
        if sig in seen_sig: dupes += 1; continue
        seen_sig.add(sig)
        shipped.append(item)

    # stable id assignment: sort by (domain, level, signature)
    shipped.sort(key=lambda x:(x["domain"], LEVELS.index(x["cefr_level"]), signature(x)))
    counters = defaultdict(int)
    for it in shipped:
        pfx = PREFIX[it["domain"]]; lv = it["cefr_level"]
        counters[(pfx,lv)] += 1
        it["id"] = f"{pfx}-{lv}-{counters[(pfx,lv)]:06d}"
        # normalize optional keys
        for k in ("frequency_tier","sort_map","tiles","review_flag"):
            it.setdefault(k, None)
        it.setdefault("options", []); it.setdefault("correct", [])
        it.setdefault("distractor_rationales", [])

    # chunk by level
    chunks, counts, ids = {}, {}, {}
    for lv in LEVELS:
        items = [x for x in shipped if x["cefr_level"]==lv]
        fn = f"bank_{lv}.json"
        json.dump(items, open(os.path.join(DATA_DIR,fn),"w",encoding="utf-8"), ensure_ascii=False)
        chunks[lv]=fn; counts[lv]=len(items); ids[lv]=[x["id"] for x in items]

    index = {"levels":LEVELS,"chunks":chunks,"counts":counts,"ids":ids,
             "total":len(shipped),"schema":"impara-v1"}
    json.dump(index, open(os.path.join(DATA_DIR,"index.json"),"w",encoding="utf-8"), ensure_ascii=False)

    # coverage ledger
    ledger = {"total":len(shipped),"by_level":counts,
              "by_domain":dict(Counter(x["domain"] for x in shipped)),
              "by_format":dict(Counter(x["format"] for x in shipped)),
              "by_level_domain":{},"silent_ratio_by_level":{},"audio_dist":dict(Counter(x["audio"] for x in shipped)),
              "duplicates_removed":dupes,"sent_to_review":len(review)}
    for lv in LEVELS:
        sub=[x for x in shipped if x["cefr_level"]==lv]
        ledger["by_level_domain"][lv]=dict(Counter(x["domain"] for x in sub))
        silent=sum(1 for x in sub if x["audio"] in ("silent","enhanced"))
        ledger["silent_ratio_by_level"][lv]=round(silent/len(sub),3) if sub else None
    json.dump(ledger, open(os.path.join(DELIV,"coverage_ledger.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)

    # media manifest (desired audio for every lemma we ship; status to_produce)
    manifest, seen_lemma = [], set()
    for x in shipped:
        it=x.get("italian") or {}; lemma=it.get("lemma")
        if not lemma or lemma in seen_lemma: continue
        seen_lemma.add(lemma)
        art=it.get("article"); rec=(art+" " if art else "")+lemma
        manifest.append({"path":f"media/audio/{x.get('thematic_group','misc')}/{slug(lemma)}.opus","type":"audio",
            "for_item_ids":[x["id"]],"record_text":rec,
            "voice_note":"native speaker; multiple speakers for phonology/minimal-pair","image_concept":None,
            "spec":"Opus ~48kbps mono","status":"to_produce"})
    json.dump({"assets":manifest,"note":"Emoji cues need no asset; only audio listed. All to_produce (silent-first build)."},
              open(os.path.join(DELIV,"media_manifest.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)

    json.dump(review, open(os.path.join(DELIV,"review_queue.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"Shipped {len(shipped)} | dupes {dupes} | review {len(review)}")
    print("By level:", counts)
    print("By domain:", ledger["by_domain"])
    print("By format:", ledger["by_format"])
    print("Silent ratio:", ledger["silent_ratio_by_level"])
    print(f"Media assets desired: {len(manifest)}")

if __name__ == "__main__":
    main()
