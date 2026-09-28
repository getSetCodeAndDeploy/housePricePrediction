"""Train and select the house-price regression model.

Run from the model-api directory:  python scripts/train.py

Why this script looks the way it does (interview notes):
- The dataset has only 50 rows and the features are extremely collinear
  (pairwise r > 0.9). A single train/test split would be very noisy, so we
  use repeated K-fold cross-validation to compare models.
- Plain OLS is compared with Ridge (L2). Ridge shrinks coefficients and
  stabilises them under collinearity. Features are standardised inside a
  Pipeline so scaling is learned only from training folds (no leakage) and
  the same transform is applied automatically at prediction time.
- The final model is refit on ALL data, and CV metrics are reported as the
  honest estimate of generalisation.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RepeatedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "house_price_dataset.csv"
OUT = ROOT / "artifacts"

FEATURES = [
    "square_footage",
    "bedrooms",
    "bathrooms",
    "year_built",
    "lot_size",
    "distance_to_city_center",
    "school_rating",
]
TARGET = "price"
ALPHAS = [0.01, 0.1, 0.3, 1.0, 3.0, 10.0]
SEED = 42


def make_pipeline(model) -> Pipeline:
    return Pipeline([("scaler", StandardScaler()), ("model", model)])


def cv_scores(pipe: Pipeline, X: pd.DataFrame, y: pd.Series) -> dict:
    cv = RepeatedKFold(n_splits=5, n_repeats=10, random_state=SEED)
    res = cross_validate(
        pipe,
        X,
        y,
        cv=cv,
        scoring={
            "r2": "r2",
            "mae": "neg_mean_absolute_error",
            "rmse": "neg_root_mean_squared_error",
        },
    )
    return {
        "r2": float(res["test_r2"].mean()),
        "r2_std": float(res["test_r2"].std()),
        "mae": float(-res["test_mae"].mean()),
        "rmse": float(-res["test_rmse"].mean()),
    }


def main() -> None:
    df = pd.read_csv(DATA)
    X, y = df[FEATURES], df[TARGET]

    candidates: dict[str, Pipeline] = {"linear_regression": make_pipeline(LinearRegression())}
    for a in ALPHAS:
        candidates[f"ridge_alpha_{a}"] = make_pipeline(Ridge(alpha=a))
    for a in ALPHAS:
        candidates[f"ridge_positive_alpha_{a}"] = make_pipeline(Ridge(alpha=a, positive=True))

    comparison = {name: cv_scores(p, X, y) for name, p in candidates.items()}

    # Selection rule (a deliberate judgement, explained in the README):
    # unconstrained models get the best raw CV error, but with collinear features they
    # give NEGATIVE weights to e.g. square_footage, so "bigger house => cheaper" in
    # what-if analysis. We therefore only consider positive-constrained Ridge models in
    # which every feature still contributes, and pick the lowest CV RMSE among them.
    eligible = []
    for name, pipe in candidates.items():
        if not name.startswith("ridge_positive"):
            continue
        fitted = pipe.fit(X, y)
        if np.all(fitted.named_steps["model"].coef_ > 0):
            eligible.append(name)
    best_name = min(eligible, key=lambda n: comparison[n]["rmse"])
    best = candidates[best_name].fit(X, y)

    pred = best.predict(X)
    train_metrics = {
        "r2": float(r2_score(y, pred)),
        "mae": float(mean_absolute_error(y, pred)),
        "rmse": float(np.sqrt(mean_squared_error(y, pred))),
    }

    scaler: StandardScaler = best.named_steps["scaler"]
    model = best.named_steps["model"]
    std_coefs = model.coef_
    # Convert standardised coefficients back to original units (per 1 unit of feature):
    #   price = intercept_std + sum(coef_std * (x - mean)/scale)
    raw_coefs = std_coefs / scaler.scale_
    raw_intercept = float(model.intercept_ - np.sum(raw_coefs * scaler.mean_))

    info = {
        "model_type": best_name,
        "algorithm": type(model).__name__,
        "hyperparameters": {k: v for k, v in model.get_params().items()},
        "features": FEATURES,
        "target": TARGET,
        "intercept": raw_intercept,
        "coefficients": dict(zip(FEATURES, map(float, raw_coefs))),
        "standardized_coefficients": dict(zip(FEATURES, map(float, std_coefs))),
        # Training-set means: lets clients explain a prediction as "vs. an average home".
        "feature_means": dict(zip(FEATURES, map(float, scaler.mean_))),
        "metrics": {
            "cross_validation": comparison[best_name],
            "cross_validation_method": "RepeatedKFold(n_splits=5, n_repeats=10)",
            "training": train_metrics,
        },
        "model_comparison": comparison,
        "training_rows": int(len(df)),
        "feature_ranges": {
            f: {"min": float(X[f].min()), "max": float(X[f].max())} for f in FEATURES
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "notes": [
            "Only 50 training rows; features are highly collinear (pairwise r > 0.9).",
            "Individual coefficients should be interpreted with caution; predictions are more reliable than coefficient signs.",
            "Predictions outside the training feature ranges are extrapolations.",
        ],
    }

    OUT.mkdir(exist_ok=True)
    joblib.dump(best, OUT / "model.joblib")
    (OUT / "model_info.json").write_text(json.dumps(info, indent=2))

    print(f"{'model':<22}{'CV R2':>8}{'CV MAE':>10}{'CV RMSE':>10}")
    for n, m in comparison.items():
        mark = "  <-- selected" if n == best_name else ""
        print(f"{n:<22}{m['r2']:>8.4f}{m['mae']:>10.0f}{m['rmse']:>10.0f}{mark}")
    print("\nCoefficients (original units):")
    for f, c in info["coefficients"].items():
        print(f"  {f:<26}{c:>12.2f}")
    print(f"  {'intercept':<26}{raw_intercept:>12.2f}")


if __name__ == "__main__":
    main()
