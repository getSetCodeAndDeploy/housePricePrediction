"""App 1 backend (Python/FastAPI) - Property Value Estimator.

Responsibilities: validate form submissions, call the model container, enrich results
(price/sqft, per-feature contributions), keep a history, and compare properties.
"""
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .db import HistoryStore
from .model_client import ModelClient, ModelError
from .schemas import (CompareRequest, CompareResponse, CompareRow, Estimate, EstimateRequest,
                      HouseFeatures)

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    http = httpx.AsyncClient(base_url=config.MODEL_API_URL, timeout=config.MODEL_TIMEOUT_S)
    state["model"] = ModelClient(http)
    state["store"] = HistoryStore(config.DB_PATH)
    yield
    await http.aclose()
    state.clear()


app = FastAPI(title="App 1 - Property Value Estimator API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


def get_model() -> ModelClient:
    return state["model"]


def get_store() -> HistoryStore:
    return state["store"]


# ---- error handling: every error has the same {detail, errors?} shape -------------------
@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errors})


@app.exception_handler(ModelError)
async def model_error_handler(_: Request, exc: ModelError):
    body = {"detail": exc.message}
    if exc.detail:
        body["errors"] = exc.detail
    return JSONResponse(status_code=exc.status_code, content=body)


# ---- helpers ------------------------------------------------------------------------------
async def _estimate_one(model: ModelClient, req: EstimateRequest) -> tuple[dict, dict]:
    feats = HouseFeatures(**req.model_dump(exclude={"label"})).model_dump()
    pred, info = (await model.predict([feats]))[0], await model.info()
    coefs, means = info["coefficients"], info["feature_means"]
    # Effect of each feature relative to an "average home" (linear model => exact decomposition).
    baseline = info["intercept"] + sum(coefs[f] * means[f] for f in info["features"])
    contributions = [
        {"feature": f, "value": feats[f], "average": round(means[f], 4),
         "contribution": round(coefs[f] * (feats[f] - means[f]), 2)}
        for f in info["features"]
    ]
    payload = {
        "features": feats,
        "predicted_price": pred["predicted_price"],
        "price_per_sqft": round(pred["predicted_price"] / feats["square_footage"], 2),
        "warnings": pred["warnings"],
        "contributions": contributions,
        "baseline_price": round(baseline, 2),
    }
    return payload, feats


# ---- routes ---------------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "app1-backend"}


@app.get("/health/model")
async def model_health(model: ModelClient = Depends(get_model)):
    return {"model_api": await model.health()}


@app.post("/api/estimates", response_model=Estimate, status_code=201, tags=["estimates"])
async def create_estimate(req: EstimateRequest, model: ModelClient = Depends(get_model),
                          store: HistoryStore = Depends(get_store)):
    """Validate, predict, enrich, save to history and return the estimate."""
    payload, _ = await _estimate_one(model, req)
    return store.add(req.label, payload)


@app.get("/api/estimates", tags=["estimates"])
async def list_estimates(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                         store: HistoryStore = Depends(get_store)):
    items, total = store.list(limit, offset)
    return {"total": total, "items": items}


@app.get("/api/estimates/{estimate_id}", response_model=Estimate, tags=["estimates"])
async def get_estimate(estimate_id: int, store: HistoryStore = Depends(get_store)):
    found = store.get(estimate_id)
    if not found:
        raise HTTPException(404, "Estimate not found")
    return found


@app.delete("/api/estimates/{estimate_id}", status_code=204, tags=["estimates"])
async def delete_estimate(estimate_id: int, store: HistoryStore = Depends(get_store)):
    if not store.delete(estimate_id):
        raise HTTPException(404, "Estimate not found")


@app.delete("/api/estimates", tags=["estimates"])
async def clear_history(store: HistoryStore = Depends(get_store)):
    return {"deleted": store.clear()}


@app.post("/api/compare", response_model=CompareResponse, tags=["compare"])
async def compare(req: CompareRequest, model: ModelClient = Depends(get_model),
                  store: HistoryStore = Depends(get_store)):
    """Side-by-side comparison of saved estimates (`ids`) or ad-hoc `properties` (not saved)."""
    if req.ids:
        found = store.get_many(req.ids)
        missing = sorted(set(req.ids) - {f["id"] for f in found})
        if missing:
            raise HTTPException(404, f"Estimate(s) not found: {missing}")
        items = [(f["label"] or f"Estimate #{f['id']}", f) for f in found]
    else:
        items = []
        for i, p in enumerate(req.properties, 1):
            payload, _ = await _estimate_one(model, p)
            items.append((p.label or f"Property {i}", payload))

    base = items[0][1]["predicted_price"]
    rows = [
        CompareRow(
            label=label, features=d["features"], predicted_price=d["predicted_price"],
            price_per_sqft=d["price_per_sqft"], diff_vs_first=round(d["predicted_price"] - base, 2),
            diff_vs_first_pct=round((d["predicted_price"] - base) / base * 100, 2),
        )
        for label, d in items
    ]
    return CompareResponse(rows=rows, best_value_label=min(rows, key=lambda r: r.price_per_sqft).label)
