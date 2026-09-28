import pytest
from fastapi.testclient import TestClient

from app.main import app

SAMPLE = {
    "square_footage": 1550, "bedrooms": 3, "bathrooms": 2, "year_built": 1997,
    "lot_size": 6800, "distance_to_city_center": 4.1, "school_rating": 7.6,
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "model_loaded": True}


def test_model_info(client):
    j = client.get("/model-info").json()
    assert set(j["coefficients"]) == set(SAMPLE)
    assert j["metrics"]["cross_validation"]["r2"] > 0.9
    assert set(j["feature_means"]) == set(SAMPLE)


def test_predict_single(client):
    r = client.post("/predict", json=SAMPLE)
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 1
    assert 150_000 < body["predictions"][0]["predicted_price"] < 450_000


def test_predict_batch(client):
    r = client.post("/predict", json={"instances": [SAMPLE, {**SAMPLE, "square_footage": 2200}]})
    p = [x["predicted_price"] for x in r.json()["predictions"]]
    assert r.status_code == 200 and len(p) == 2 and p[1] > p[0]


def test_validation_error(client):
    r = client.post("/predict", json={**SAMPLE, "school_rating": 42})
    assert r.status_code == 422 and r.json()["errors"]


def test_missing_field(client):
    bad = {k: v for k, v in SAMPLE.items() if k != "lot_size"}
    assert client.post("/predict", json=bad).status_code == 422


def test_extrapolation_warning(client):
    r = client.post("/predict", json={**SAMPLE, "square_footage": 9000})
    assert r.json()["predictions"][0]["warnings"]
