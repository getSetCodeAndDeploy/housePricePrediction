import httpx
import pytest
from fastapi.testclient import TestClient

from app.db import HistoryStore
from app.main import app, get_model, get_store
from app.model_client import ModelClient

FEATURES = ["square_footage", "bedrooms", "bathrooms", "year_built", "lot_size",
            "distance_to_city_center", "school_rating"]
COEFS = dict(zip(FEATURES, [20.0, 4000.0, 15000.0, 300.0, 9.0, 12000.0, 18000.0]))
INTERCEPT = -700_000.0
MEANS = dict(zip(FEATURES, [1700.0, 3.0, 2.0, 1996.0, 7200.0, 4.6, 7.8]))
SAMPLE = {"square_footage": 1500, "bedrooms": 3, "bathrooms": 2, "year_built": 1995,
          "lot_size": 6500, "distance_to_city_center": 4.0, "school_rating": 7.5}


def fake_model_api(mode="ok"):
    def handler(request: httpx.Request) -> httpx.Response:
        if mode == "down":
            raise httpx.ConnectError("refused")
        if mode == "reject":
            return httpx.Response(422, json={"errors": [{"field": "x", "message": "bad"}]})
        if request.url.path == "/model-info":
            return httpx.Response(200, json={"features": FEATURES, "coefficients": COEFS, "intercept": INTERCEPT, "feature_means": MEANS})
        if request.url.path == "/predict":
            import json
            rows = json.loads(request.content)["instances"]
            preds = [{"predicted_price": round(INTERCEPT + sum(COEFS[f] * r[f] for f in FEATURES), 2),
                      "warnings": []} for r in rows]
            return httpx.Response(200, json={"count": len(preds), "predictions": preds})
        return httpx.Response(200, json={"status": "ok", "model_loaded": True})
    return handler


def make_client(mode="ok"):
    http = httpx.AsyncClient(base_url="http://model", transport=httpx.MockTransport(fake_model_api(mode)))
    store = HistoryStore(":memory:")
    app.dependency_overrides[get_model] = lambda: ModelClient(http)
    app.dependency_overrides[get_store] = lambda: store
    return TestClient(app)


@pytest.fixture
def client():
    yield make_client()
    app.dependency_overrides.clear()


def test_create_estimate_and_contributions_sum(client):
    r = client.post("/api/estimates", json={**SAMPLE, "label": "Home A"})
    assert r.status_code == 201
    b = r.json()
    assert b["label"] == "Home A" and b["id"] == 1
    total = sum(c["contribution"] for c in b["contributions"]) + b["baseline_price"]
    assert abs(total - b["predicted_price"]) < 1  # chart data reconciles with the prediction
    sqft = next(c for c in b["contributions"] if c["feature"] == "square_footage")
    assert sqft["average"] == 1700.0 and sqft["contribution"] == round(20.0 * (1500 - 1700), 2)  # below average => negative
    assert b["price_per_sqft"] == round(b["predicted_price"] / 1500, 2)


@pytest.mark.parametrize("field,value", [("school_rating", 11), ("bedrooms", -1),
                                          ("square_footage", "abc"), ("year_built", 1500)])
def test_validation_errors(client, field, value):
    r = client.post("/api/estimates", json={**SAMPLE, field: value})
    assert r.status_code == 422
    assert r.json()["errors"][0]["field"] == field


def test_missing_field(client):
    bad = {k: v for k, v in SAMPLE.items() if k != "lot_size"}
    r = client.post("/api/estimates", json=bad)
    assert r.status_code == 422 and r.json()["errors"][0]["field"] == "lot_size"


def test_history_get_delete_clear(client):
    for i in range(3):
        client.post("/api/estimates", json={**SAMPLE, "square_footage": 1500 + i * 100})
    h = client.get("/api/estimates").json()
    assert h["total"] == 3 and h["items"][0]["id"] == 3  # newest first
    assert client.get("/api/estimates/2").json()["id"] == 2
    assert client.delete("/api/estimates/2").status_code == 204
    assert client.get("/api/estimates/2").status_code == 404
    assert client.delete("/api/estimates").json() == {"deleted": 2}


def test_compare_saved(client):
    client.post("/api/estimates", json={**SAMPLE, "label": "A"})
    client.post("/api/estimates", json={**SAMPLE, "square_footage": 2000, "label": "B"})
    r = client.post("/api/compare", json={"ids": [1, 2]}).json()
    assert [x["label"] for x in r["rows"]] == ["A", "B"]
    assert r["rows"][0]["diff_vs_first"] == 0 and r["rows"][1]["diff_vs_first"] == 10000


def test_compare_adhoc_not_saved(client):
    r = client.post("/api/compare", json={"properties": [SAMPLE, {**SAMPLE, "bedrooms": 4}]})
    assert r.status_code == 200 and len(r.json()["rows"]) == 2
    assert client.get("/api/estimates").json()["total"] == 0


def test_compare_rules(client):
    assert client.post("/api/compare", json={"ids": [1]}).status_code == 422
    assert client.post("/api/compare", json={"ids": [1, 2], "properties": [SAMPLE, SAMPLE]}).status_code == 422
    assert client.post("/api/compare", json={"ids": [98, 99]}).status_code == 404


def test_model_down_returns_503():
    c = make_client("down")
    r = c.post("/api/estimates", json=SAMPLE)
    app.dependency_overrides.clear()
    assert r.status_code == 503 and "unreachable" in r.json()["detail"]


def test_model_rejection_passthrough():
    c = make_client("reject")
    r = c.post("/api/estimates", json=SAMPLE)
    app.dependency_overrides.clear()
    assert r.status_code == 422 and r.json()["errors"]
