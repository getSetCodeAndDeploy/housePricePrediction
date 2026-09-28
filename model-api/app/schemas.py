from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class HouseFeatures(BaseModel):
    """Input features for one property. Field names match the training columns."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "square_footage": 1550,
                "bedrooms": 3,
                "bathrooms": 2,
                "year_built": 1997,
                "lot_size": 6800,
                "distance_to_city_center": 4.1,
                "school_rating": 7.6,
            }
        }
    )

    square_footage: float = Field(..., gt=200, le=20000, description="Interior area in sq ft")
    bedrooms: int = Field(..., ge=0, le=20)
    bathrooms: float = Field(..., ge=0.5, le=20, description="Half baths allowed (e.g. 2.5)")
    year_built: int = Field(..., ge=1800, le=date.today().year + 1)
    lot_size: float = Field(..., gt=0, le=1_000_000, description="Lot area in sq ft")
    distance_to_city_center: float = Field(..., ge=0, le=200, description="Distance in km/miles")
    school_rating: float = Field(..., ge=0, le=10)


class PredictRequest(BaseModel):
    instances: list[HouseFeatures] = Field(..., min_length=1, max_length=1000)


class Prediction(BaseModel):
    predicted_price: float
    warnings: list[str] = Field(
        default_factory=list,
        description="Set when an input lies outside the training range (extrapolation).",
    )


class PredictResponse(BaseModel):
    count: int
    predictions: list[Prediction]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
