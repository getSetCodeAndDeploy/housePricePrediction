from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class HouseFeatures(BaseModel):
    """Same fields/limits as the model API, so bad input is rejected here before any network call."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "square_footage": 1550, "bedrooms": 3, "bathrooms": 2, "year_built": 1997,
                "lot_size": 6800, "distance_to_city_center": 4.1, "school_rating": 7.6,
            }
        }
    )
    square_footage: float = Field(..., gt=200, le=20000)
    bedrooms: int = Field(..., ge=0, le=20)
    bathrooms: float = Field(..., ge=0.5, le=20)
    year_built: int = Field(..., ge=1800, le=date.today().year + 1)
    lot_size: float = Field(..., gt=0, le=1_000_000)
    distance_to_city_center: float = Field(..., ge=0, le=200)
    school_rating: float = Field(..., ge=0, le=10)


class EstimateRequest(HouseFeatures):
    label: str | None = Field(None, max_length=60, description="Optional name, e.g. 'Maple St house'")


class Contribution(BaseModel):
    feature: str
    value: float
    average: float = Field(description="Mean of this feature in the training data")
    contribution: float = Field(description="coefficient x (value - average): price effect vs. an average home")


class Estimate(BaseModel):
    id: int
    created_at: datetime
    label: str | None
    features: HouseFeatures
    predicted_price: float
    price_per_sqft: float
    warnings: list[str]
    baseline_price: float = Field(description="Predicted price of an average home")
    contributions: list[Contribution] = Field(description="baseline_price + sum(contribution) == predicted_price")


class CompareRequest(BaseModel):
    ids: list[int] | None = Field(None, description="Ids of saved estimates")
    properties: list[EstimateRequest] | None = Field(None, description="Or ad-hoc properties")

    @model_validator(mode="after")
    def _one_source(self):
        n_ids = len(self.ids or [])
        n_props = len(self.properties or [])
        if (n_ids > 0) == (n_props > 0):
            raise ValueError("Provide exactly one of `ids` or `properties`")
        if not 2 <= max(n_ids, n_props) <= 5:
            raise ValueError("Compare between 2 and 5 properties")
        return self


class CompareRow(BaseModel):
    label: str
    features: HouseFeatures
    predicted_price: float
    price_per_sqft: float
    diff_vs_first: float
    diff_vs_first_pct: float


class CompareResponse(BaseModel):
    rows: list[CompareRow]
    best_value_label: str = Field(description="Lowest price per square foot")
