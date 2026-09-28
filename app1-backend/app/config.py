import os
from pathlib import Path

MODEL_API_URL = os.getenv("MODEL_API_URL", "http://localhost:8000")
MODEL_TIMEOUT_S = float(os.getenv("MODEL_TIMEOUT_S", "5"))
DB_PATH = Path(os.getenv("DB_PATH", "data/history.db"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
