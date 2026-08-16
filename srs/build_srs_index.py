#!/usr/bin/env python3
"""
Build the SRS knowledge-component (KC) index from question_bank.json.

The raw topic_tags in the bank are far too fragmented for Bayesian propagation
(4,700+ distinct tags, ~2,900 singletons; the 'datum' concept alone is spread
across ~40 near-synonym strings). This script collapses the messy tags into a
controlled vocabulary of KCs so that answering one NAD27 question updates a
single shared 'geodesy-datums' component that every sibling datum card also
references.

Outputs (into ./srs/):
  srs_cards.json : [{id, area, scope, type, kcs:[...]}]  -- scheduling metadata only
  srs_kcs.json   : {kc: {label, count}}                  -- KC catalog with sizes
The engine consumes srs_cards.json; the full question content stays in
question_bank.json and is joined by id at runtime.
"""
import json, os, re
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
BANK = os.path.join(HERE, "..", "question_bank", "question_bank.json")

# Tags that describe item FORMAT / cognition, not content -> never become KCs.
NOISE = {
    "terminology","application","error-correction","error correction","two-tier","two tier",
    "select-all","select all","sort","sorting","categorize","categorization","categorisation",
    "definitions","definition","term-recall","term recall","recall","analysis","comprehension",
    "application-scenario","scenario","multiple choice","mcq","matching","taxonomy",
    "single-best-answer","knowledge","concept","fact","review","practice",
}

# Canonical KCs. Each is (kc_id, human_label, [trigger substrings]).
# A normalized tag maps to a KC if any trigger is a substring of the tag.
# A tag may map to several KCs (richer propagation); unmatched tags fall back to
# the coarse content-area KC only.
RULES = [
 ("geodesy-datums","Datums, geoid & ellipsoid",
   ["datum","nad27","nad83","nad 27","nad 83","wgs84","wgs 84","geoid","ellipsoid","spheroid","nadcon","reference frame","reference ellipsoid"]),
 ("map-projections","Map projections",
   ["projection","mercator","utm","state plane","conformal","equal-area","equal area","equidistant","azimuthal","conic","cylindrical","sinusoidal","gnomonic","transverse","distortion"]),
 ("coordinate-systems","Coordinate reference systems",
   ["coordinate","crs","reproject","plane coordinate","geographic coordinate","projected coordinate","on-the-fly","on the fly","graticule"]),
 ("earth-geometry","Earth geometry & geomatics",
   ["earth geometry","great circle","geodesic","latitude","longitude","geomatics","vincenty","trilateration"]),
 ("data-models","Vector & raster data models",
   ["vector","raster","data model","point line","grid cell","cell matrix","tessellation","spatial primitive"]),
 ("topology","Topology & spatial relationships",
   ["topology","topological","adjacency","connectivity","planar","arc-node","arc node","9-intersection","de-9im","de9im","contiguity","euler","spatial relationship"]),
 ("data-quality","Data quality & uncertainty",
   ["data quality","accuracy","precision","uncertainty","error propagation","completeness","positional accuracy","attribute accuracy","validation","lineage"]),
 ("resolution-scale","Resolution & scale",
   ["resolution","map scale","representative fraction"," scale","scale "]),
 ("metadata-standards","Metadata & standards",
   ["metadata","iso 19115","fgdc","csdgm","ogc","standard","interoperab","inspire","spatial data infrastructure","sdi"]),
 ("temporal-data","Temporal & spatiotemporal data",
   ["temporal","spatio-temporal","spatiotemporal","time series","time-series"]),
 ("cartographic-design","Cartographic design",
   ["map design","symbol","symbology","color","colour","typography","legend","thematic","choropleth","visual hierarchy","map element","map layout","generaliz"]),
 ("geovisualization","Geovisualization & 3D",
   ["visualization","visualisation","geovis","3d visual","virtual globe","city model","3d city","dashboard"]),
 ("surface-interpolation","Surfaces, DEM & interpolation",
   ["interpolation","kriging","idw","inverse distance","dem","dsm","dtm","tin","contour","hillshade","slope","aspect","terrain","elevation surface"]),
 ("remote-sensing-fundamentals","Remote sensing fundamentals",
   ["remote sensing","remote-sensing","electromagnetic","spectral signature","spectral","reflectance","wavelength"," band","sensor","platform","radiometr","emr","spectrum"]),
 ("image-classification","Image classification & change detection",
   ["classification","scene-classification","land cover","land-cover","land use","supervised","unsupervised","segmentation","change-detection","change detection","image analysis"]),
 ("sar-radar","SAR & radar",
   ["sar","radar","insar","interferometr","backscatter","polarimetr","microwave"]),
 ("hyperspectral","Hyperspectral & spectral unmixing",
   ["hyperspectral","spectral unmixing","unmixing","endmember","spectral variability"]),
 ("lidar-photogrammetry","LiDAR, point clouds & photogrammetry",
   ["lidar","point cloud","point-cloud","photogrammetr","structure from motion","structure-from-motion","sfm","multi-view stereo","3d reconstruction","3d scanning","scan-to-bim"]),
 ("uav-drone","UAV / drone remote sensing",
   ["uav","drone","unmanned"]),
 ("calibration-correction","Calibration & atmospheric correction",
   ["calibration","atmospheric correction","radiometric calibration","geometric correction","orthorectif","atmospheric-correction"]),
 ("data-acquisition","Field & automated data acquisition",
   ["field data","gps","gnss","survey","digitiz","data collection","data capture","total station"]),
 ("vgi-crowdsourcing","VGI, crowdsourcing & open data",
   ["vgi","volunteered","crowdsourc","openstreetmap","osm","web scraping","web-scraping","open data","open-source data","citizen science"]),
 ("georeferencing","Georeferencing & transformation",
   ["georeferenc","rubber-sheet","rubbersheet","rubber sheet","affine","coordinate transformation","coordinate-transformation","warp","registration"]),
 ("file-formats","Spatial file formats & conversion",
   ["file format","file-format","shapefile","geojson","geopackage","geotiff","vector tile","kml","gml","format conversion","data format"]),
 ("data-integration","Data integration & conflation",
   ["integration","conflation","entity linkage","entity-linkage","record matching","data fusion","merge"]),
 ("spatial-query","Spatial & attribute queries",
   ["query","selection","sql","attribute query","spatial query","view","filter expression"]),
 ("overlay-analysis","Overlay & vector operations",
   ["overlay","buffer","clip","intersect","union","dissolve","vector-operation","vector operation","spatial join","proximity"]),
 ("map-algebra","Map algebra & raster analysis",
   ["map algebra","raster analysis","local operation","focal","zonal","reclassif","cell statistics","boolean raster","raster overlay"]),
 ("network-analysis","Network analysis & routing",
   ["network","shortest path","shortest-path","routing","service area","origin-destination"]),
 ("spatial-statistics","Spatial statistics",
   ["spatial statistics","autocorrelation","moran","point pattern","point-pattern","geostatistic","variogram","regression","gwr","complete spatial randomness","csr","spatial weight","hot spot","getis","ripley","pair correlation","spatial dependence","car model","sar model"]),
 ("descriptive-statistics","Descriptive statistics",
   ["descriptive statistic","histogram","standard deviation","correlation coefficient","mean center","classification method","natural breaks","quantile"]),
 ("database-design","Database design & management",
   ["database","relational","schema","normaliz","primary key","foreign key","join","relate","geodatabase","dbms","cardinality","er model","entity-relationship"]),
 ("nosql-bigdata","NoSQL & spatial big data",
   ["nosql","big data","big-data","distributed","spark","sedona","geospark","scalab","mapreduce","hadoop"]),
 ("data-security-privacy","Data security & location privacy",
   ["security","privacy","access control","encryption","anonymiz","geomask","geoprivacy","confidential","location privacy"]),
 ("web-services","Web services & protocols",
   ["wms","wfs","wcs","ogc api","rest","web service","web-service","tile service","data transfer","protocol","api endpoint"]),
 ("webgis-architecture","Web GIS architecture",
   ["webgis","web gis","web-gis","docker","microservice","client-server","client server","deployment","architecture"]),
 ("scripting-automation","Scripting & automation",
   ["scripting","python","model builder","modelbuilder","coding","programming","automation","geoprocessing script"]),
 ("systems-architecture","Systems design & cloud",
   ["systems architecture","system design","cloud","platform","infrastructure","edge computing","enterprise gis"]),
 ("geoai-ml","GeoAI & machine learning",
   ["geoai","machine learning","deep learning","neural network","foundation model","representation learning","transformer","self-supervised","cnn","llm","autonomous-gis","autonomous gis","artificial intelligence"]),
 ("knowledge-graphs","Knowledge graphs & semantics",
   ["knowledge graph","knowledge-graph","ontology","semantic","linked data"]),
 ("trajectory-mobility","Trajectory & mobility data",
   ["trajectory","mobility","movement data","gps trace","human mobility"]),
 ("ethics-certification","Ethics, professional practice & certification",
   ["ethics","ethical","code of conduct","professional conduct","licensure","certification","gisp","professional practice","professional organization","rules of conduct"]),
 ("open-source-gis","Open-source GIS tools",
   ["qgis","saga","grass gis","open source gis","open-source gis","gdal","postgis","geoserver"]),
 ("landforms-geomorphology","Landforms & geomorphology",
   ["landform","geomorph","weathering","erosion","glaci","fluvial","aeolian","coastal process","mass wasting","karst"]),
 ("geology-tectonics","Geology & plate tectonics",
   ["geology","geologic","rock","mineral","tectonic","plate ","volcan","earthquake","seismic","magma","igneous","sedimentary","metamorphic","rock cycle"]),
 ("atmosphere-climate","Atmosphere, weather & climate",
   ["atmosphere","weather","climate","precipitation","humidity","wind","storm","front","pressure system","greenhouse","el nino"]),
 ("hydrology-water","Hydrology & water",
   ["hydrolog","watershed","river","groundwater","aquifer","water cycle","ocean","runoff","drainage","streamflow"]),
 ("biogeography-soils","Biogeography, soils & ecosystems",
   ["biogeograph","ecosystem","biome","soil","vegetation","biogeochem","carbon cycle","nutrient","nitrogen cycle","succession"]),
 ("natural-hazards","Natural hazards",
   ["hazard","flood","wildfire","tsunami","landslide","drought","tornado","hurricane","disaster","volcanic eruption"]),
 ("population-demography","Population & demography",
   ["population","demograph","migration","fertility","mortality","census","urbanization","urbanisation"]),
 ("culture-society","Culture, language & religion",
   ["culture","cultural","language","religion","ethnicity","ethnic","linguistic"]),
 ("economic-political-geography","Economic, political & urban geography",
   ["economic geography","political geography","globalization","globalisation","development","trade","urban geography","agriculture","industry","geopolit"]),
 ("regional-geography","Regional geography",
   ["region","europe","asia","africa","americas","oceania","north america","south america","middle east","russia","latin america","subsaharan","caribbean","country"]),
 ("applied-gis","Applied GIS (planning, health, disaster)",
   ["urban planning","public health","epidemiolog","emergency","planning practice","green infrastructure","sustainable city","smart city","geospatial intelligence"]),
]

def norm(t): return re.sub(r"\s+"," ",str(t).strip().lower())

def slug(s): return re.sub(r"[^a-z0-9]+","-",s.lower()).strip("-")

def kcs_for_tag(tag):
    out=[]
    for kc,_lab,keys in RULES:
        for k in keys:
            if k in tag:
                out.append(kc); break
    return out

def main():
    items=json.load(open(BANK))
    cards=[]
    kc_count=Counter()
    kc_labels={kc:lab for kc,lab,_ in RULES}
    area_labels={}
    unmatched_tag_counts=Counter()
    fine_hit=0
    for it in items:
        area=it.get("content_area","")
        area_kc="area:"+slug(area)
        area_labels[area_kc]=area
        fine=set()
        for raw in (it.get("topic_tags") or []):
            t=norm(raw)
            if not t or t in NOISE: continue
            hits=kcs_for_tag(t)
            if hits: fine.update(hits)
            else: unmatched_tag_counts[t]+=1
        if fine: fine_hit+=1
        # Card KC set: fine concept KCs (primary) + coarse area KC (always present, fallback).
        kcs=sorted(fine)[:5]+[area_kc]
        for kc in kcs: kc_count[kc]+=1
        cards.append({
            "id":it.get("id"),
            "area":area,
            "scope":it.get("scope"),
            "type":it.get("item_type"),
            "kcs":kcs,
        })
    # KC catalog
    catalog={}
    for kc,c in kc_count.items():
        lab=kc_labels.get(kc) or area_labels.get(kc) or kc
        catalog[kc]={"label":lab,"count":c,"kind":("area" if kc.startswith("area:") else "concept")}
    outdir=HERE
    json.dump(cards,open(os.path.join(outdir,"srs_cards.json"),"w"),ensure_ascii=False)
    json.dump(catalog,open(os.path.join(outdir,"srs_kcs.json"),"w"),ensure_ascii=False,indent=1)

    print(f"cards={len(cards)}  with>=1 concept KC: {fine_hit} ({100*fine_hit/len(cards):.0f}%)")
    print(f"distinct KCs={len(catalog)} (concept={sum(1 for v in catalog.values() if v['kind']=='concept')}, area={sum(1 for v in catalog.values() if v['kind']=='area')})")
    print("\nTop concept KCs by card count:")
    for kc,v in sorted(catalog.items(),key=lambda x:-x[1]['count']):
        if v['kind']=='concept':
            print(f"  {v['count']:4d}  {kc:28s} {v['label']}")
    print(f"\nUnmatched non-noise tags (fell back to area only): {len(unmatched_tag_counts)} distinct, {sum(unmatched_tag_counts.values())} occurrences")
    # datum propagation sanity check
    datum_cards=[c for c in cards if "geodesy-datums" in c["kcs"]]
    proj_cards=[c for c in cards if "map-projections" in c["kcs"]]
    print(f"\nSanity: geodesy-datums cards={len(datum_cards)}, map-projections cards={len(proj_cards)}")
    print("Example geodesy-datums card ids:", [c['id'] for c in datum_cards[:8]])

if __name__=="__main__":
    main()
