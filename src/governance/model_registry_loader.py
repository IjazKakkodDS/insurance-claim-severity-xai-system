from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

import joblib


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models"
GOVERNANCE_DIR = PROJECT_ROOT / "artifacts" / "governance"

DEFAULT_MODEL_PATH = MODELS_DIR / "best_model.pkl"
DEFAULT_PIPELINE_PATH = MODELS_DIR / "feature_pipeline.pkl"

PRODUCTION_POINTER_PATH = GOVERNANCE_DIR / "production_model_pointer.json"
REGISTRY_METADATA_PATH = GOVERNANCE_DIR / "registry_metadata.json"


class ModelRegistryLoader:
    """
    Local-first registry-aware loader.

    Current behavior:
    1. Reads production pointer if available
    2. Reads registry metadata if available
    3. Loads current production model/pipeline from local production artifacts
    4. Falls back safely to default pickle paths

    This gives us a clean transition path from hardcoded files
    toward a more complete registry-driven serving setup.
    """

    def __init__(self) -> None:
        self.production_pointer_path = PRODUCTION_POINTER_PATH
        self.registry_metadata_path = REGISTRY_METADATA_PATH
        self.default_model_path = DEFAULT_MODEL_PATH
        self.default_pipeline_path = DEFAULT_PIPELINE_PATH

    def _read_json(self, path: Path) -> Optional[Dict[str, Any]]:
        if not path.exists():
            return None

        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)

    def get_production_pointer(self) -> Optional[Dict[str, Any]]:
        return self._read_json(self.production_pointer_path)

    def get_registry_metadata(self) -> Optional[Dict[str, Any]]:
        return self._read_json(self.registry_metadata_path)

    def load_model(self):
        if not self.default_model_path.exists():
            raise FileNotFoundError(
                f"Production model file not found at: {self.default_model_path}"
            )
        return joblib.load(self.default_model_path)

    def load_pipeline(self):
        if not self.default_pipeline_path.exists():
            raise FileNotFoundError(
                f"Production pipeline file not found at: {self.default_pipeline_path}"
            )
        return joblib.load(self.default_pipeline_path)

    def load_production_artifacts(self):
        model = self.load_model()
        pipeline = self.load_pipeline()
        return model, pipeline

    def get_active_model_summary(self) -> Dict[str, Any]:
        pointer = self.get_production_pointer()
        metadata = self.get_registry_metadata()

        return {
            "production_pointer_found": pointer is not None,
            "registry_metadata_found": metadata is not None,
            "active_model_name": pointer.get("active_model_name") if pointer else None,
            "active_run_id": pointer.get("active_run_id") if pointer else None,
            "stage": pointer.get("stage") if pointer else None,
            "registered_at_utc": metadata.get("registered_at_utc") if metadata else None,
            "model_file": metadata.get("model_file") if metadata else str(self.default_model_path),
            "pipeline_file": metadata.get("pipeline_file") if metadata else str(self.default_pipeline_path),
        }