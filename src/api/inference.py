import json
import os
from pathlib import Path

import pandas as pd

from src.governance.model_registry_loader import ModelRegistryLoader


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"


class InferenceService:
    def __init__(self):
        # Registry-aware loader
        self.registry_loader = ModelRegistryLoader()
        self.model, self.pipeline = self.registry_loader.load_production_artifacts()
        self.active_model_summary = self.registry_loader.get_active_model_summary()

        # FIXED PATH
        manifest_path = ARTIFACTS_DIR / "feature_manifest.json"

        if not manifest_path.exists():
            raise FileNotFoundError(
                f"Feature manifest not found at {manifest_path}"
            )

        with open(manifest_path, "r", encoding="utf-8") as f:
            self.manifest = json.load(f)

        self.categorical_features = self.manifest["categorical_features"]
        self.numerical_features = self.manifest["numerical_features"]
        self.expected_features = ["id"] + self.categorical_features + self.numerical_features

    def validate_input(self, input_data: dict) -> dict:
        input_keys = set(input_data.keys())
        expected_keys = set(self.expected_features)

        invalid_features = input_keys - expected_keys

        return {
            "invalid_features": list(invalid_features),
            "is_valid": len(invalid_features) == 0
        }

    def get_model_registry_info(self) -> dict:
        return self.active_model_summary

    def predict(self, input_data: dict) -> dict:
        if not input_data:
            raise ValueError("Input features cannot be empty")

        validation = self.validate_input(input_data)
        if not validation["is_valid"]:
            raise ValueError(
                f"Invalid features provided: {validation['invalid_features']}"
            )

        full_input = {}

        for col in self.expected_features:
            if col in input_data:
                full_input[col] = input_data[col]
            else:
                if col == "id":
                    full_input[col] = 0
                elif col in self.categorical_features:
                    full_input[col] = "missing"
                else:
                    full_input[col] = 0

        df = pd.DataFrame([full_input])

        X_transformed = self.pipeline.transform(df)
        prediction = float(self.model.predict(X_transformed)[0])

        return {
            "prediction": prediction,
            "model_registry_info": self.active_model_summary
        }