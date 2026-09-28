# Housing Price Prediction API (Task 1)

FastAPI + scikit-learn service that predicts house prices from 7 features.

## Run
```bash
# Docker
docker build -t housing-model-api . && docker run -p 8000:8000 housing-model-api
# or locally (Python 3.12+)
python -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```
Swagger UI: http://localhost:8000/docs

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/predict` | One property (object) or many (`{"instances": [...]}`) |
| GET | `/model-info` | Coefficients, intercept, CV/training metrics, model comparison |
| GET | `/health` | Liveness + model-loaded flag |

## Retrain / test
```bash
python scripts/train.py   # writes artifacts/model.joblib + model_info.json
pytest
```

## Modelling decisions
- **50 rows, features correlated at r > 0.9** -> repeated 5-fold CV (x10) instead of one split.
- **Pipeline(StandardScaler, Ridge)**: scaling is fit inside each fold (no leakage) and applied automatically at inference.
- **Positive-constrained Ridge (alpha=0.1)**: unconstrained models score slightly better on CV (RMSE ~9.6k vs ~10.0k) but assign a *negative* weight to square footage, so "bigger house => cheaper" in what-if analysis. Constraining weights >= 0 costs ~0.4k RMSE and keeps predictions monotonic and explainable.
- `distance_to_city_center` has a *positive* weight because in this dataset farther homes are pricier (collinear with size/newness). Data-driven, not causal.
- Inputs are validated (ranges, types); values outside the training range return `warnings` (extrapolation).
