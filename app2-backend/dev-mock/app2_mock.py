"""DEV-ONLY stand-in for the Spring Boot market-analysis backend (app2-backend).

Why it exists: it lets the portal UI be built/tested where the Java service can't be compiled or run, and gives
you a fallback for a live demo. It mirrors the Java API contract (paths, query params, snake_case JSON, error
shape, formulas) but is NOT the deliverable - the Java service is.

Run (from app2-backend/dev-mock, using the model-api virtualenv for fastapi/pandas/httpx):
    MODEL_API_URL=http://localhost:8000 ../../model-api/.venv/bin/uvicorn app2_mock:app --port 8002
"""
import io
import math
import os
from pathlib import Path

import httpx
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response

MODEL_API_URL = os.getenv("MODEL_API_URL", "http://localhost:8000")
CSV = Path(__file__).resolve().parents[1] / "src/main/resources/data/house_price_dataset.csv"
DF = pd.read_csv(CSV)
DF["price_per_sqft"] = DF.price / DF.square_footage
FEATURES = ["square_footage", "bedrooms", "bathrooms", "year_built", "lot_size", "distance_to_city_center", "school_rating"]
INTEGER = {"bedrooms", "year_built"}
LIMITS = {  # mirrors PropertyInput's Bean Validation limits (lo, hi, lo_exclusive)
    "square_footage": (200, 20000, True), "bedrooms": (0, 20, False), "bathrooms": (0.5, 20, False),
    "year_built": (1800, 2100, False), "lot_size": (0, 1_000_000, True),
    "distance_to_city_center": (0, 200, False), "school_rating": (0, 10, False),
}
SORTS = set(FEATURES) | {"id", "price", "price_per_sqft"}
calls = {"stats_hits": 0, "stats_misses": 0}
_stats_cache: dict = {}

app = FastAPI(title="App 2 dev mock")


class Invalid(Exception):
    pass


@app.exception_handler(Invalid)
async def _invalid(_: Request, e: Invalid):
    return JSONResponse(status_code=422, content={"detail": str(e)})


@app.exception_handler(RequestValidationError)
async def _validation(_: Request, e: RequestValidationError):
    errs = [{"field": ".".join(str(p) for p in x["loc"][1:]), "message": x["msg"]} for x in e.errors()]
    return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errs})


def r2(v):
    return round(float(v) * 100) / 100


def filtered(q: dict) -> pd.DataFrame:
    d = DF
    for col, lo, hi in (("price", "minPrice", "maxPrice"), ("bedrooms", "minBedrooms", "maxBedrooms"),
                        ("year_built", "minYear", "maxYear"), ("square_footage", "minSqft", "maxSqft")):
        if q.get(lo) not in (None, ""):
            d = d[d[col] >= float(q[lo])]
        if q.get(hi) not in (None, ""):
            d = d[d[col] <= float(q[hi])]
    return d


def group(d, key_fn, label):
    out = []
    for k, g in d.groupby(d.apply(key_fn, axis=1)):
        out.append({"key": label(k), "count": int(len(g)), "avg_price": r2(g.price.mean()), "avg_price_per_sqft": r2(g.price_per_sqft.mean())})
    return out


@app.get("/actuator/health")
def health():
    return {"status": "UP"}


@app.get("/api/market/stats")
def stats(request: Request, bins: int = 8):
    if not 2 <= bins <= 50:
        raise Invalid("bins must be between 2 and 50")
    q = dict(request.query_params)
    key = str(sorted(q.items()))
    if key in _stats_cache:
        calls["stats_hits"] += 1
        return _stats_cache[key]
    calls["stats_misses"] += 1
    d = filtered(q)
    if d.empty:
        res = {"summary": {"count": 0, "avg_price": 0, "median_price": 0, "min_price": 0, "max_price": 0, "std_dev_price": 0,
                           "avg_price_per_sqft": 0, "avg_square_footage": 0},
               "by_bedrooms": [], "by_decade_built": [], "price_histogram": [], "price_correlations": []}
    else:
        p = d.price.to_numpy(float)
        lo, hi = p.min(), p.max()
        if hi == lo:
            hist = [{"from": lo, "to": hi, "count": len(p)}]
        else:
            w = (hi - lo) / bins
            counts = [0] * bins
            for v in p:
                counts[min(bins - 1, int((v - lo) / w))] += 1
            hist = [{"from": r2(lo + i * w), "to": r2(lo + (i + 1) * w), "count": counts[i]} for i in range(bins)]
        corr = []
        for f in FEATURES:
            x = d[f].to_numpy(float)
            r = 0.0 if x.std() == 0 or p.std() == 0 else float(np.corrcoef(x, p)[0, 1])
            corr.append({"feature": f, "r": round(r * 1000) / 1000})
        res = {
            "summary": {"count": int(len(d)), "avg_price": r2(p.mean()), "median_price": r2(np.median(p)), "min_price": float(lo),
                        "max_price": float(hi), "std_dev_price": r2(p.std(ddof=1)) if len(p) > 1 else 0,
                        "avg_price_per_sqft": r2(d.price_per_sqft.mean()), "avg_square_footage": r2(d.square_footage.mean())},
            "by_bedrooms": group(d, lambda r: int(r.bedrooms), str),
            "by_decade_built": group(d, lambda r: int(r.year_built) // 10 * 10, lambda k: f"{k}s"),
            "price_histogram": hist, "price_correlations": corr,
        }
    _stats_cache[key] = res
    return res


@app.get("/api/houses")
def houses(request: Request, sortBy: str = "id", dir: str = "asc", page: int = 0, size: int = 20):
    if sortBy not in SORTS:
        raise Invalid(f"Unknown sortBy '{sortBy}'. Valid: {sorted(SORTS)}")
    if dir.lower() not in ("asc", "desc"):
        raise Invalid("dir must be 'asc' or 'desc'")
    if page < 0 or size < 1 or size > 200:
        raise Invalid("page must be >= 0 and size between 1 and 200")
    d = filtered(dict(request.query_params)).sort_values(sortBy, ascending=dir.lower() == "asc", kind="stable")
    total = len(d)
    rows = d.iloc[page * size:(page + 1) * size]
    items = [{**{k: (int(v) if k in INTEGER or k == "id" else float(v)) for k, v in r.items() if k != "price_per_sqft"},
              "price_per_sqft": r2(r.price_per_sqft)} for _, r in rows.iterrows()]
    return {"items": items, "total": total, "page": page, "size": size}


@app.get("/api/houses/export.csv")
def export(request: Request):
    d = filtered(dict(request.query_params)).copy()
    d["price_per_sqft"] = d.price_per_sqft.map(r2)
    buf = io.StringIO()
    d[["id", *FEATURES, "price", "price_per_sqft"]].to_csv(buf, index=False)
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="houses.csv"'})


@app.get("/api/meta/features")
def meta():
    return [{"feature": f, "min": float(DF[f].min()), "max": float(DF[f].max())} for f in FEATURES]


@app.get("/api/cache/stats")
def cache_stats():
    h, m = calls["stats_hits"], calls["stats_misses"]
    return {"marketStats": {"hit_count": h, "miss_count": m, "hit_rate": h / (h + m) if h + m else 0, "size": len(_stats_cache)}}


def check_base(b: dict, where="base"):
    missing = [f for f in FEATURES if b.get(f) is None]
    if missing:
        raise HTTPException(422, detail={"detail": "Validation failed", "errors": [{"field": f"{where}.{m}", "message": "must not be null"} for m in missing]})
    for f, (lo, hi, excl) in LIMITS.items():
        v = b[f]
        if (v <= lo if excl else v < lo) or v > hi:
            raise Invalid(f"Scenario is invalid: {f} must be {'>' if excl else '>='} {lo} and <= {hi}")


def predict(rows: list[dict]) -> list[dict]:
    try:
        r = httpx.post(f"{MODEL_API_URL}/predict", json={"instances": rows}, timeout=5)
    except httpx.HTTPError:
        raise HTTPException(503, detail="Model service is unreachable or timed out")
    if r.status_code == 422:
        raise Invalid("Model service rejected the input (422)")
    r.raise_for_status()
    return r.json()["predictions"]


@app.exception_handler(HTTPException)
async def _http(_: Request, e: HTTPException):
    body = e.detail if isinstance(e.detail, dict) else {"detail": e.detail}
    return JSONResponse(status_code=e.status_code, content=body)


def apply(base: dict, feature: str, value: float) -> dict:
    if feature not in FEATURES:
        raise Invalid(f"Unknown feature '{feature}'. Valid: {FEATURES}")
    return {**base, feature: int(round(value)) if feature in INTEGER else float(value)}


@app.post("/api/what-if")
async def what_if(request: Request):
    body = await request.json()
    base, changes = body.get("base") or {}, body.get("changes")
    if not changes:
        raise HTTPException(422, detail={"detail": "Validation failed", "errors": [{"field": "changes", "message": "must not be empty"}]})
    check_base(base)
    scen = dict(base)
    for k, v in changes.items():
        scen = apply(scen, k, v)
    check_base(scen)
    p = predict([base, scen])
    b, s = p[0]["predicted_price"], p[1]["predicted_price"]
    return {"baseline": base, "scenario": scen, "baseline_price": b, "scenario_price": s, "delta": r2(s - b),
            "delta_pct": r2((s - b) / b * 100) if b else 0, "warnings": p[1].get("warnings") or []}


@app.post("/api/what-if/sweep")
async def sweep(request: Request):
    body = await request.json()
    base, feature = body.get("base") or {}, body.get("feature")
    lo, hi, steps = body.get("from"), body.get("to"), body.get("steps")
    check_base(base)
    if feature not in FEATURES:
        raise Invalid(f"Unknown feature '{feature}'. Valid: {FEATURES}")
    if not isinstance(steps, int) or not 2 <= steps <= 50:
        raise HTTPException(422, detail={"detail": "Validation failed", "errors": [{"field": "steps", "message": "must be between 2 and 50"}]})
    if lo >= hi:
        raise Invalid("'from' must be less than 'to'")
    xs = []
    for i in range(steps):
        v = lo + i * (hi - lo) / (steps - 1)
        v = float(round(v)) if feature in INTEGER else round(v * 10000) / 10000
        if v not in xs:
            xs.append(v)
    rows = [apply(base, feature, x) for x in xs]
    for r in rows:
        check_base(r)
    preds = predict(rows)
    return {"feature": feature, "points": [{"value": x, "predicted_price": p["predicted_price"]} for x, p in zip(xs, preds)]}
