#!/usr/bin/env python3
"""Phase 1 — fetch native Italian word audio from Wikimedia Commons for all 993
manifest assets, transcode (afconvert), place under app/media/audio/, and emit a
resumable cache. Wiring of banks + reports is done by wire_audio.py afterwards.

Resumable: results are cached in build/audio_cache.json keyed by lemma. Re-running
skips already-resolved+downloaded lemmas. Polite: real UA, maxlag, throttled,
exponential backoff on HTTP 429/5xx.
"""
import json, os, sys, time, re, random, urllib.parse, urllib.request, collections, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "build/deliverables/media_manifest.json")
MEDIA_ROOT = os.path.join(ROOT, "app/media/audio")
CACHE = os.path.join(ROOT, "build/audio_cache.json")
API = "https://commons.wikimedia.org/w/api.php"
UA = ("italian_resources-audio/1.0 (personal language-learning project; "
      "contact aadland6@gmail.com)")
SPACING = 0.6          # seconds between API calls (API is not the bottleneck)
DL_SPACING = 1.3       # base seconds between file downloads (upload.wikimedia.org rate-limits hard)
MAXLAG = 5

def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    delay = SPACING
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 500) and attempt < 5:
                wait = min(60, 2 ** attempt * 2)
                sys.stderr.write(f"  [{e.code}] backoff {wait}s\n"); sys.stderr.flush()
                time.sleep(wait); continue
            raise
        except Exception:
            if attempt < 5:
                time.sleep(2 ** attempt); continue
            raise
    raise RuntimeError("unreachable")

def api(params):
    params = dict(params, format="json", maxlag=MAXLAG)
    time.sleep(SPACING)
    return json.loads(_get(API + "?" + urllib.parse.urlencode(params)))

def strip_html(s):
    return re.sub("<[^>]+>", "", s or "").strip()

def parse_info(page):
    if "missing" in page:
        return None
    ii = (page.get("imageinfo") or [{}])[0]
    if not ii.get("url"):
        return None
    em = ii.get("extmetadata", {})
    return {
        "title": page["title"],
        "url": ii.get("url"),
        "mime": ii.get("mime"),
        "license": (em.get("LicenseShortName") or {}).get("value"),
        "artist": strip_html((em.get("Artist") or {}).get("value"))[:80],
    }

def wiktionary_candidates(lemma):
    w = lemma.replace("-", " ")
    forms = {lemma, w, w.replace(" ", "_"), w[:1].upper() + w[1:]}
    return [f"File:It-{f}.ogg" for f in forms]

def batch_imageinfo(titles):
    """Resolve a batch (<=50) of File: titles -> {title: info|None}."""
    out = {}
    d = api({"action": "query", "titles": "|".join(titles), "prop": "imageinfo",
             "iiprop": "url|extmetadata|mime"})
    # normalize maps requested title -> resolved title
    norm = {n["from"]: n["to"] for n in (d.get("query", {}).get("normalized") or [])}
    pages = (d.get("query") or {}).get("pages", {})
    by_title = {p.get("title"): p for p in pages.values()}
    for t in titles:
        rt = norm.get(t, t)
        info = parse_info(by_title.get(rt, {"title": rt, "missing": True}))
        out[t] = info
    return out

def ll_search(lemma):
    word = lemma.replace("-", " ")
    d = api({"action": "query", "list": "search", "srnamespace": "6", "srlimit": "8",
             "srsearch": f'incategory:"Lingua Libre pronunciation-ita" intitle:"{word}"'})
    return [h["title"] for h in (d.get("query") or {}).get("search", [])]

def broad_search(lemma):
    word = lemma.replace("-", " ")
    d = api({"action": "query", "list": "search", "srnamespace": "6", "srlimit": "10",
             "srsearch": (f'intitle:"{word}" (incategory:"Lingua Libre pronunciation-ita" '
                          f'OR incategory:"Italian pronunciation")')})
    return [h["title"] for h in (d.get("query") or {}).get("search", [])]

def title_matches(title, lemma):
    """Heuristic: does a Commons file title correspond to this lemma?"""
    word = lemma.replace("-", " ").lower()
    t = title.lower()
    # LL: 'LL-Q652 (ita)-Speaker-word.wav' ; Wiktionary: 'File:It-word.ogg'
    stem = re.sub(r"\.[a-z0-9]+$", "", t)
    stem = re.sub(r"^file:", "", stem)
    tail = re.split(r"[-–]", stem)[-1].strip()
    return tail == word or stem.endswith(word)

def ext_for(mime, url):
    m = (mime or "").lower()
    if "wav" in m: return ".wav"
    if "ogg" in m: return ".ogg"
    if "mpeg" in m or "mp3" in m: return ".mp3"
    return os.path.splitext(urllib.parse.urlparse(url).path)[1] or ".ogg"

def download(url, dest):
    time.sleep(DL_SPACING + random.uniform(0, 0.7))   # jitter to avoid bursty rate-limit trips
    data = _get(url)
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)

def transcode(src, out_base):
    """Return final path. WAV -> AAC m4a via afconvert; else keep original ext."""
    ext = os.path.splitext(src)[1].lower()
    if ext == ".wav":
        out = out_base + ".m4a"
        r = subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000",
                            "-c", "1", src, out],
                           capture_output=True, text=True)
        if r.returncode == 0 and os.path.getsize(out) > 0:
            os.remove(src); return out
        # fall back to keeping the wav if afconvert fails
        keep = out_base + ".wav"; os.replace(src, keep); return keep
    out = out_base + ext
    os.replace(src, out)
    return out

def main():
    manifest = json.load(open(MANIFEST))
    assets = [a for a in manifest["assets"] if a.get("type") == "audio"]
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}

    # unique lemmas -> asset meta (category, path)
    targets = {}
    for a in assets:
        parts = a["path"].split("/")
        lemma = parts[-1].rsplit(".", 1)[0]
        targets[lemma] = {"category": parts[2], "lemma": lemma}
    lemmas = sorted(targets)
    todo = [l for l in lemmas if not (cache.get(l) or {}).get("done")]
    print(f"{len(lemmas)} lemmas, {len(lemmas)-len(todo)} cached, {len(todo)} to do", flush=True)

    # ---- Stage A: batch Wiktionary resolution for all TODO lemmas ----
    cand_map = {}                       # candidate title -> lemma
    for l in todo:
        for t in wiktionary_candidates(l):
            cand_map.setdefault(t, l)
    cand_titles = list(cand_map)
    resolved = {}                       # lemma -> info
    print(f"Stage A: Wiktionary batch over {len(cand_titles)} candidate titles", flush=True)
    for i in range(0, len(cand_titles), 50):
        chunk = cand_titles[i:i+50]
        for t, info in batch_imageinfo(chunk).items():
            if info:
                l = cand_map[t]
                resolved.setdefault(l, dict(info, source="wiktionary"))
        if (i // 50) % 5 == 0:
            print(f"  ...{i+len(chunk)}/{len(cand_titles)} candidates", flush=True)
    print(f"Stage A hits: {len(resolved)}", flush=True)

    # ---- Stage B/C: Lingua Libre + broad search for the rest ----
    misses = [l for l in todo if l not in resolved]
    print(f"Stage B: Lingua Libre search for {len(misses)} misses", flush=True)
    for n, l in enumerate(misses):
        titles = ll_search(l) or broad_search(l)
        titles = [t for t in titles if title_matches(t, l)]
        if not titles:
            resolved[l] = None
            continue
        info = None
        for t in titles[:3]:
            got = batch_imageinfo([t]).get(t)
            if got:
                info = dict(got, source="lingualibre"); break
        resolved[l] = info
        if n % 25 == 0:
            print(f"  ...{n}/{len(misses)} searched", flush=True)

    # ---- Stage D: download + transcode ----
    print("Stage D: download + transcode", flush=True)
    done_n = 0
    for l in todo:
        info = resolved.get(l)
        meta = targets[l]
        if not info:
            cache[l] = {"done": True, "found": False, "category": meta["category"]}
            continue
        cat_dir = os.path.join(MEDIA_ROOT, meta["category"])
        os.makedirs(cat_dir, exist_ok=True)
        tmp = os.path.join(cat_dir, l + ext_for(info["mime"], info["url"]))
        try:
            download(info["url"], tmp)
            final = transcode(tmp, os.path.join(cat_dir, l))
        except Exception as e:
            print(f"  ERR {l}: {e}", flush=True)
            continue
        rel = os.path.relpath(final, os.path.join(ROOT, "app"))
        cache[l] = {
            "done": True, "found": True, "category": meta["category"],
            "audio_ref": rel, "source": info["source"], "commons_title": info["title"],
            "license": info["license"], "artist": info["artist"],
            "commons_url": f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(info['title'])}",
            "bytes": os.path.getsize(final),
        }
        done_n += 1
        if done_n % 25 == 0:
            json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=1)
            print(f"  downloaded {done_n} (checkpoint saved)", flush=True)

    json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=1)
    found = sum(1 for v in cache.values() if v.get("found"))
    print(f"\nDONE. resolved cache: {len(cache)}; native found: {found}/{len(lemmas)} "
          f"= {100*found//len(lemmas)}%", flush=True)

if __name__ == "__main__":
    main()
