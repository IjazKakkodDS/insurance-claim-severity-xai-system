from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import mlflow
import mlflow.sklearn


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts" / "governance"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODELS_DIR / "best_model.pkl"
PIPELINE_PATH = MODELS_DIR / "feature_pipeline.pkl"

MLFLOW_TRACKING_URI = f"file:///{(PROJECT_ROOT / 'mlruns').as_posix()}"
EXPERIMENT_NAME = "insurance-claim-severity-xai"
MODEL_NAME = "claim_severity_model"
PIPELINE_ARTIFACT_NAME = "feature_pipeline.pkl"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_required_files() -> None:
    missing_files = []

    if not MODEL_PATH.exists():
        missing_files.append(str(MODEL_PATH))

    if not PIPELINE_PATH.exists():
        missing_files.append(str(PIPELINE_PATH))

    if missing_files:
        raise FileNotFoundError(
            f"Missing required artifact(s): {', '.join(missing_files)}"
        )


def load_artifacts():
    model = joblib.load(MODEL_PATH)
    pipeline = joblib.load(PIPELINE_PATH)
    return model, pipeline


def build_metadata(run_id: str) -> dict:
    return {
        "project_name": "Explainable Insurance Claim Severity Model",
        "model_name": MODEL_NAME,
        "registered_at_utc": utc_now_iso(),
        "mlflow_run_id": run_id,
        "tracking_uri": MLFLOW_TRACKING_URI,
        "model_file": str(MODEL_PATH.relative_to(PROJECT_ROOT)),
        "pipeline_file": str(PIPELINE_PATH.relative_to(PROJECT_ROOT)),
        "stage": "Production",
        "version_note": "Initial local registry registration after Phase 7 Docker completion",
    }


def save_registry_metadata(metadata: dict) -> None:
    output_path = ARTIFACTS_DIR / "registry_metadata.json"
    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2)


def save_production_pointer(metadata: dict) -> None:
    pointer = {
        "active_model_name": metadata["model_name"],
        "active_run_id": metadata["mlflow_run_id"],
        "stage": metadata["stage"],
        "updated_at_utc": utc_now_iso(),
    }

    output_path = ARTIFACTS_DIR / "production_model_pointer.json"
    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(pointer, file, indent=2)


def register_model() -> None:
    validate_required_files()

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_NAME)

    model, pipeline = load_artifacts()

    with mlflow.start_run(run_name="claim_severity_production_registration") as run:
        run_id = run.info.run_id

        mlflow.log_param("model_name", MODEL_NAME)
        mlflow.log_param("model_type", type(model).__name__)
        mlflow.log_param("pipeline_type", type(pipeline).__name__)
        mlflow.log_param("registration_mode", "local_first")
        mlflow.log_param("serving_framework", "FastAPI")

        mlflow.set_tag("project", "insurance-claim-severity-xai")
        mlflow.set_tag("stage", "Production")
        mlflow.set_tag("environment", "local")
        mlflow.set_tag("phase", "Phase 8 - Model Registry + Version Control")
        mlflow.set_tag("registered_by", "manual_registry_script")

        mlflow.sklearn.log_model(
            sk_model=model,
            artifact_path="model",
            registered_model_name=MODEL_NAME,
        )

        mlflow.log_artifact(str(PIPELINE_PATH), artifact_path="pipeline")

        metadata = build_metadata(run_id=run_id)
        save_registry_metadata(metadata)
        save_production_pointer(metadata)

        mlflow.log_artifact(
            str(ARTIFACTS_DIR / "registry_metadata.json"),
            artifact_path="governance",
        )
        mlflow.log_artifact(
            str(ARTIFACTS_DIR / "production_model_pointer.json"),
            artifact_path="governance",
        )

        print("=" * 60)
        print("Model registration completed successfully.")
        print(f"Run ID: {run_id}")
        print(f"Experiment: {EXPERIMENT_NAME}")
        print(f"Tracking URI: {MLFLOW_TRACKING_URI}")
        print(f"Registered Model Name: {MODEL_NAME}")
        print("=" * 60)


if __name__ == "__main__":
    register_model()