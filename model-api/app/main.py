from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .model_service import ModelService
from .schemas import HealthResponse, HouseFeatures, PredictRequest, PredictResponse

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["svc"] = ModelService()  # fail fast at startup if artifacts are missing
    yield
    state.clear()


app = FastAPI(
    title="Housing Price Prediction API",
    version="1.0.0",
    description="Ridge regression model that predicts house prices from 7 property features.",
    lifespan=lifespan,
)

# Task 2's Next.js/BFF layers call this service; open CORS is fine for a demo.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    """Return compact, frontend-friendly validation errors."""
    errors = [
        {"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errors})


def svc() -> ModelService:
    if "svc" not in state:
        raise HTTPException(503, "Model not loaded")
    return state["svc"]


@app.get("/health", response_model=HealthResponse, tags=["ops"])
def health():
    return HealthResponse(status="ok", model_loaded="svc" in state)


@app.get("/model-info", tags=["model"])
def model_info():
    """Coefficients, intercept, hyperparameters and performance metrics."""
    return svc().info


@app.post("/predict", response_model=PredictResponse, tags=["model"])
def predict(body: HouseFeatures | PredictRequest):
    """Predict for one property (send a single object) or many (send `{"instances": [...]}`)."""
    items = body.instances if isinstance(body, PredictRequest) else [body]
    preds = svc().predict(items)
    return PredictResponse(count=len(preds), predictions=preds)
