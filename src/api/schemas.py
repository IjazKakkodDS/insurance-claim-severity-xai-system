from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any


class PredictionRequest(BaseModel):
    """
    Request schema for prediction endpoint.
    Accepts a dictionary of feature_name : value.
    Supports both numerical and categorical features.
    """

    features: Dict[str, Any] = Field(
        ...,
        min_length=1,
        description="Dictionary of feature names and their values",
        example={
            "cont1": 0.726,
            "cont2": 0.54,
            "cat1": "A",
            "cat2": "B"
        }
    )

    # 🔥 FIX 1: Prevent empty input
    @field_validator("features")
    @classmethod
    def validate_features_not_empty(cls, v):
        if not v:
            raise ValueError("Features dictionary cannot be empty")
        return v

    # 🔥 FIX 2: Basic type validation
    @field_validator("features")
    @classmethod
    def validate_feature_values(cls, v):
        for key, value in v.items():

            # Allow numeric
            if isinstance(value, (int, float)):
                continue

            # Allow string (categorical)
            if isinstance(value, str):
                continue

            raise ValueError(
                f"Invalid type for feature '{key}'. Must be int, float, or string."
            )

        return v


class PredictionResponse(BaseModel):
    """
    Response schema for prediction endpoint.
    """

    prediction: float = Field(
        ...,
        example=1850.42
    )

    request_id: str = Field(
        ...,
        example="b3e4f0c4-0a92-4c1b-9d54-8f92e2d5d1f1"
    )


class ExplainResponse(BaseModel):
    """
    Response schema for explain endpoint.
    Includes prediction and SHAP explanation.
    """

    prediction: float = Field(
        ...,
        example=1850.42
    )

    explanation: Dict[str, float] = Field(
        ...,
        example={
            "feature_140": 23.4,
            "feature_92": -15.2
        }
    )

    request_id: str = Field(
        ...,
        example="b3e4f0c4-0a92-4c1b-9d54-8f92e2d5d1f1"
    )


class HealthResponse(BaseModel):
    """
    Health check response schema
    """

    status: str = Field(
        ...,
        example="healthy"
    )