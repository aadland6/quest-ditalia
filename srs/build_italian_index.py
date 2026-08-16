#!/usr/bin/env python3
"""
Build the SRS knowledge-component (KC) index from question_bank/italian_bank.json.

Collapses each item into a small set of canonical KCs so Bayesian Knowledge
Tracing can propagate: missing one congiuntivo card lowers `conj-congiuntivo`
mastery, which pulls every sibling congiuntivo card sooner AND makes the
in-game conjugation drill engine (game/js/data/conjdrills.js) target that
tense — the drill KC ids here MUST stay in sync with CONJ_KCS there.

KC families:
  conj-<tense>       verb conjugation per tense (shared with the drill engine)
  gra:<concept>      grammar concepts (articles, prepositions, clitics, ...)
  voc:<theme>        vocabulary by thematic group
  phon:<contrast>    phonology (geminates, stress, gli/gn, ...)
  area:<slug>        coarse content-area fallback (always present)

Outputs (into ./game/data/):
  srs_cards.json : [{id, area, scope, type, kcs:[...]}]  -- scheduling metadata only
  srs_kcs.json   : {kc: {label, count, kind}}            -- KC catalog with sizes
"""
import json
import os
import re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "question_bank", "italian_bank.json")
OUTDIR = os.path.join(ROOT, "game", "data")

# --- conjugation tense KCs (ids shared with game/js/data/conjdrills.js) ------
# (kc, label, [regexes matched against the normalized item text])
CONJ_RULES = [
 ("conj-passato-prossimo", "Passato prossimo",
   [r"passato[ -]prossimo", r"ausiliar", r"participi", r"essere o avere"]),
 ("conj-imperfetto", "Imperfetto",
   [r"(?<!congiuntivo )(?<!cong-)imperfetto"]),
 ("conj-trapassato", "Trapassato prossimo", [r"trapassato"]),
 ("conj-futuro", "Futuro semplice", [r"futuro(?! anteriore)"]),
 ("conj-futuro-anteriore", "Futuro anteriore", [r"futuro anteriore"]),
 ("conj-condizionale", "Condizionale presente", [r"condizionale(?! passato)"]),
 ("conj-cond-passato", "Condizionale passato", [r"condizionale passato"]),
 ("conj-congiuntivo", "Congiuntivo presente",
   [r"congiuntivo(?! imperfetto)(?! passato)", r"subjunctive"]),
 ("conj-cong-passato", "Congiuntivo passato", [r"congiuntivo passato"]),
 ("conj-cong-imperfetto", "Congiuntivo imperfetto",
   [r"congiuntivo imperfetto", r"cong-imperfetto"]),
 ("conj-gerundio", "Stare + gerundio", [r"gerundio", r"progressiv"]),
 ("conj-presente", "Presente indicativo",
   [r"(?<!congiuntivo )(?<!condizionale )presente(?! del congiuntivo)",
    r"present tense", r"presente indicativo"]),
 ("conj-imperativo", "Imperativo", [r"imperativ"]),
]

# --- grammar concept KCs ------------------------------------------------------
GRA_RULES = [
 ("gra:articoli", "Articoli", [r"articol", r"determinativ", r"indeterminativ"]),
 ("gra:nomi-genere-plurale", "Genere e plurale dei nomi",
   [r"plurale", r"maschile", r"femminile", r"genere", r"\bgender\b", r"invariabil"]),
 ("gra:aggettivi-accordo", "Accordo degli aggettivi",
   [r"aggettiv", r"\baccordo\b", r"concordanza", r"agreement"]),
 ("gra:possessivi", "Possessivi", [r"possessiv"]),
 ("gra:dimostrativi", "Dimostrativi", [r"dimostrativ", r"questo|quello"]),
 ("gra:preposizioni", "Preposizioni (semplici e articolate)",
   [r"preposizion", r"preposition", r"articolat"]),
 ("gra:pronomi-clitici", "Pronomi e clitici",
   [r"pronom", r"pronoun", r"clitic", r"\bci-ne\b", r"lo-gli",
    r"oggetto diretto", r"oggetto indiretto", r"combinati", r"riflessiv", r"reflexive"]),
 ("gra:piacere", "Piacere e verbi simili", [r"piacere", r"piaccion", r"piace\b"]),
 ("gra:interrogativi", "Interrogativi", [r"interrogativ", r"question word"]),
 ("gra:negazione", "Negazione", [r"negazion", r"negation", r"negativ"]),
 ("gra:numeri-tempo", "Numeri, ore e date",
   [r"numer", r"che ora|che ore", r"orari", r"\bdata\b", r"quanto costa"]),
 ("gra:comparativi", "Comparativi e superlativi",
   [r"comparativ", r"comparazion", r"superlativ"]),
 ("gra:relativi", "Pronomi relativi", [r"relativ"]),
 ("gra:ipotetico", "Periodo ipotetico", [r"ipotetic", r"hypothetical"]),
 ("gra:passivo", "Forma passiva", [r"passiv"]),
 ("gra:impersonale", "Si impersonale", [r"impersonale"]),
 ("gra:discorso-indiretto", "Discorso indiretto",
   [r"discorso indiretto", r"reported speech", r"indiretto-volume"]),
 ("gra:avverbi", "Avverbi", [r"avverbi"]),
 ("gra:ortografia-accenti", "Ortografia e accenti",
   [r"ortografia", r"accent", r"apostrof", r"spelling"]),
]

# --- phonology KCs (matched against italian.target_sound + topic) -------------
PHON_RULES = [
 ("phon:geminate", "Consonanti doppie (geminate)", [r"geminate", r"doppi"]),
 ("phon:accento", "Accento tonico", [r"stress", r"accento"]),
 ("phon:vocali", "Vocali aperte e chiuse", [r"open /", r"closed /", r"vocal"]),
 ("phon:gn-gli", "Suoni gn e gli", [r"/ɲ", r"\(gn\)", r"/ʎ", r"\(gli?\)"]),
 ("phon:sc", "Suono sc", [r"/ʃ", r"\(sc"]),
 ("phon:s-z", "S sonora e sorda, z", [r"s/z", r"voicing", r"/ts/|/dz/"]),
 ("phon:c-g", "C e g dure e dolci", [r"/k/|/tʃ/|/g/|/dʒ/", r"c dura|c dolce|g dura|g dolce"]),
]

MAX_FINE_KCS = 5


def norm(s):
    return re.sub(r"\s+", " ", str(s or "").strip().lower())


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def match_rules(text, rules):
    out = []
    for kc, _label, pats in rules:
        for p in pats:
            if re.search(p, text):
                out.append(kc)
                break
    return out


def item_kcs(it):
    """Fine KCs for one item, by domain."""
    domain = it.get("domain")
    p = it.get("prompt") or {}
    topic = norm(it.get("topic"))
    text = norm(" | ".join(str(x) for x in [
        it.get("topic"), p.get("text"), p.get("text_en"), p.get("sentence"),
        it.get("explanation")] if x))

    fine = []
    if domain == "vocabulary":
        theme = it.get("thematic_group")
        if topic == "vocabolario-verbi":
            fine.append("voc:frequenza-verbi")
        elif topic == "vocabolario-nomi":
            fine.append("voc:frequenza-nomi")
        elif theme:
            fine.append("voc:" + slug(theme))
    elif domain == "phonology":
        ts = norm(((it.get("italian") or {}).get("target_sound")))
        fine = match_rules(ts + " | " + text, PHON_RULES)
    elif domain == "grammar":
        fine = match_rules(text, CONJ_RULES) + match_rules(text, GRA_RULES)
    # reading: area KC only
    return fine[:MAX_FINE_KCS]


def main():
    items = json.load(open(BANK))
    labels = {kc: lab for kc, lab, _ in CONJ_RULES + GRA_RULES + PHON_RULES}
    voc_theme_labels = {
        "voc:frequenza-verbi": "Vocabolario: verbi frequenti",
        "voc:frequenza-nomi": "Vocabolario: nomi frequenti",
    }
    cards = []
    kc_count = Counter()
    area_labels = {}
    no_fine = Counter()

    for it in items:
        area = it["content_area"]
        area_kc = "area:" + slug(area)
        area_labels[area_kc] = area
        fine = item_kcs(it)
        if not fine:
            no_fine[it["domain"]] += 1
        kcs = sorted(set(fine)) + [area_kc]
        for kc in kcs:
            kc_count[kc] += 1
        cards.append({
            "id": it["id"],
            "area": area,
            "scope": it.get("cefr_level") or "",
            "type": str(it["format"]),
            "kcs": kcs,
        })
        # auto-label vocab theme KCs from the thematic group
        for kc in fine:
            if kc.startswith("voc:") and kc not in labels and kc not in voc_theme_labels:
                theme = (it.get("thematic_group") or "").replace("_", " ")
                voc_theme_labels[kc] = "Vocabolario: " + theme

    catalog = {}
    for kc, c in kc_count.items():
        lab = labels.get(kc) or voc_theme_labels.get(kc) or area_labels.get(kc) or kc
        kind = ("area" if kc.startswith("area:") else
                "vocab" if kc.startswith("voc:") else
                "phon" if kc.startswith("phon:") else
                "conj" if kc.startswith("conj-") else "concept")
        catalog[kc] = {"label": lab, "count": c, "kind": kind}

    os.makedirs(OUTDIR, exist_ok=True)
    json.dump(cards, open(os.path.join(OUTDIR, "srs_cards.json"), "w"), ensure_ascii=False)
    json.dump(catalog, open(os.path.join(OUTDIR, "srs_kcs.json"), "w"), ensure_ascii=False, indent=1)

    n_fine = len(items) - sum(no_fine.values())
    print(f"cards={len(cards)}  with>=1 fine KC: {n_fine} ({100*n_fine/len(cards):.0f}%)")
    print(f"no fine KC by domain (area-only fallback): {dict(no_fine)}")
    print(f"distinct KCs={len(catalog)}")
    for kind in ["conj", "concept", "vocab", "phon"]:
        rows = sorted(((v["count"], k, v["label"]) for k, v in catalog.items()
                       if v["kind"] == kind), reverse=True)
        print(f"\n{kind} KCs ({len(rows)}):")
        for c, k, lab in rows:
            print(f"  {c:5d}  {k:28s} {lab}")


if __name__ == "__main__":
    main()
