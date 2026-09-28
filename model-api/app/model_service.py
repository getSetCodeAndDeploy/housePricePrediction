import json
from pathlib import Path

import joblib
import pandas as pd

from .schemas import HouseFeatures, Prediction

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"


class ModelService:
    """Loads the trained pipeline once and serves predictions."""

    def __init__(self, artifacts_dir: Path = ARTIFACTS):
        self.pipeline = joblib.load(artifacts_dir / "model.joblib")
        self.info: dict = json.loads((artifacts_dir / "model_info.json").read_text())
        self.features: list[str] = self.info["features"]
        self.ranges: dict = self.info["feature_ranges"]

    def _warnings(self, row: dict) -> list[str]:
        out = []
        for f in self.features:
            lo, hi = self.ranges[f]["min"], self.ranges[f]["max"]
            if not lo <= row[f] <= hi:
                out.append(f"{f}={row[f]} is outside the training range [{lo:g}, {hi:g}]")
        return out

    def predict(self, items: list[HouseFeatures]) -> list[Prediction]:
        rows = [i.model_dump() for i in items]
        # DataFrame with column names keeps the feature order explicit and safe.
        X = pd.DataFrame(rows)[self.features]
        preds = self.pipeline.predict(X)
        return [
            Prediction(predicted_price=round(float(p), 2), warnings=self._warnings(r))
            for p, r in zip(preds, rows)
        ]
