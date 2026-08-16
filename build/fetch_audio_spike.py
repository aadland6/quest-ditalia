#!/usr/bin/env python3
"""Phase-0 spike: measure Wikimedia Commons native-audio hit-rate for repo lemmas.

For each lemma: try Wiktionary-style File:It-<lemma>.ogg, and search the
Lingua Libre Italian category. Records hit/miss + license + speaker + url.
Downloads matched files (raw .ogg/.wav) into scratch for a playback demo.
"""
import json, sys, time, urllib.parse, urllib.request, collections, os

API = "https://commons.wikimedia.org/w/api.php"
UA = "italian_resources-audio-spike/0.1 (personal language-learning; contact aadland6@gmail.com)"
OUTDIR = sys.argv[2] if len(sys.argv) > 2 else "/private/tmp/audio_spike"
os.makedirs(OUTDIR, exist_ok=True)

def api(params):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 3:
                return {"_error": str(e)}
            time.sleep(1.5 * (attempt + 1))

def imageinfo_for_titles(titles):
    """Batch imageinfo lookup for a list of 'File:...' titles."""
    res = {}
    for i in range(0, len(titles), 40):
        chunk = titles[i:i+40]
        d = api({"action":"query","titles":"|".join(chunk),
                 "prop":"imageinfo","iiprop":"url|extmetadata|mime|size"})
        pages = (d.get("query") or {}).get("pages", {})
        for p in pages.values():
            if "missing" in p:
                res[p["title"]] = None
            else:
                ii = (p.get("imageinfo") or [{}])[0]
                em = ii.get("extmetadata", {})
                res[p["title"]] = {
                    "title": p["title"],
                    "url": ii.get("url"),
                    "mime": ii.get("mime"),
                    "license": (em.get("LicenseShortName") or {}).get("value"),
                    "artist": (em.get("Artist") or {}).get("value"),
                }
        time.sleep(0.2)
    return res

def ll_search(lemma):
    """Search Lingua Libre Italian category for a lemma; return best file dict or None."""
    d = api({"action":"query","list":"search","srnamespace":"6",
             "srsearch": f'incategory:"Lingua Libre pronunciation-ita" intitle:"{lemma}"',
             "srlimit":"5"})
    hits = (d.get("query") or {}).get("search", [])
    # keep only files whose title word matches the lemma reasonably
    titles = [h["title"] for h in hits]
    if not titles:
        return None
    info = imageinfo_for_titles(titles)
    good = [v for v in info.values() if v and v.get("url")]
    return good[0] if good else None

def variants(lemma):
    w = lemma.replace("-", " ")
    cands = {lemma, w, w.replace(" ", "_"), w.capitalize()}
    return [f"File:It-{c}.ogg" for c in cands]

def strip_html(s):
    import re
    return re.sub("<[^>]+>", "", s or "").strip()

def main():
    manifest = json.load(open(sys.argv[1]))
    audio = [x for x in manifest["assets"] if x.get("type") == "audio"]
    bycat = collections.defaultdict(list)
    for x in audio:
        parts = x["path"].split("/")
        bycat[parts[2]].append(parts[-1].rsplit(".",1)[0])
    # 3 lemmas per category
    sample = [(cat, lem) for cat, lems in bycat.items() for lem in lems[:3]]

    rows = []
    to_download = []
    for cat, lemma in sample:
        rec = {"cat": cat, "lemma": lemma, "source": None,
               "file": None, "license": None, "artist": None, "url": None}
        # Tier 1a: Wiktionary It-<lemma>.ogg
        winfo = imageinfo_for_titles(variants(lemma))
        hit = next((v for v in winfo.values() if v), None)
        if hit:
            rec.update(source="wiktionary", file=hit["title"], url=hit["url"],
                       license=hit["license"], artist=strip_html(hit["artist"])[:60])
        else:
            # Tier 1b: Lingua Libre
            ll = ll_search(lemma)
            if ll:
                rec.update(source="lingualibre", file=ll["title"], url=ll["url"],
                           license=ll["license"], artist=strip_html(ll["artist"])[:60])
        if rec["url"]:
            to_download.append(rec)
        rows.append(rec)
        print(f"  {'HIT ' if rec['url'] else 'miss'} [{cat}] {lemma:16} "
              f"{rec['source'] or '-':12} {rec['license'] or ''}")

    hits = [r for r in rows if r["url"]]
    print(f"\nHIT RATE: {len(hits)}/{len(rows)} = {100*len(hits)//len(rows)}%")
    bycat_rate = collections.Counter(r["cat"] for r in hits)
    bycat_tot = collections.Counter(r["cat"] for r in rows)
    for c in bycat_tot:
        print(f"   {c:20} {bycat_rate[c]}/{bycat_tot[c]}")

    # download up to 12 for a demo
    dl = to_download[:12]
    print(f"\nDownloading {len(dl)} files -> {OUTDIR}")
    for r in dl:
        ext = ".ogg" if (r["url"] or "").endswith(".ogg") else os.path.splitext(r["url"])[1] or ".ogg"
        out = os.path.join(OUTDIR, f"{r['cat']}__{r['lemma']}{ext}")
        try:
            req = urllib.request.Request(r["url"], headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp, open(out, "wb") as f:
                f.write(resp.read())
            r["local"] = out; r["bytes"] = os.path.getsize(out)
            print(f"   ok  {os.path.basename(out)} ({r['bytes']} B)")
        except Exception as e:
            print(f"   ERR {r['lemma']}: {e}")
        time.sleep(0.2)

    json.dump(rows, open(os.path.join(OUTDIR, "spike_results.json"),"w"),
              ensure_ascii=False, indent=1)
    print(f"\nWrote {OUTDIR}/spike_results.json")

if __name__ == "__main__":
    main()
