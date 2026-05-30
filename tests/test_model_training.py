import json
import yaml
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent


def test_best_model_artifact_exists():
    assert (REPO_ROOT / "models" / "best_model.pkl").is_file()


def test_best_model_artifact_non_empty():
    path = REPO_ROOT / "models" / "best_model.pkl"
    assert path.stat().st_size > 0


def test_evaluation_report_exists():
    assert (REPO_ROOT / "reports" / "evaluation_report.json").is_file()


def test_evaluation_report_is_valid_json_with_metrics():
    path = REPO_ROOT / "reports" / "evaluation_report.json"
    assert path.stat().st_size > 0, "evaluation_report.json is empty"
    with open(path) as f:
        metrics = json.load(f)
    assert "MAE" in metrics
    assert "RMSE" in metrics
    assert "R2" in metrics


def test_evaluation_metrics_are_reasonable():
    path = REPO_ROOT / "reports" / "evaluation_report.json"
    with open(path) as f:
        metrics = json.load(f)
    assert metrics["MAE"] > 0, "MAE should be positive"
    assert metrics["RMSE"] >= metrics["MAE"], "RMSE should be >= MAE"
    assert 0.0 <= metrics["R2"] <= 1.0, "R2 should be between 0 and 1"


def test_production_model_pointer_exists():
    path = REPO_ROOT / "artifacts" / "governance" / "production_model_pointer.json"
    assert path.is_file()


def test_production_model_pointer_valid():
    path = REPO_ROOT / "artifacts" / "governance" / "production_model_pointer.json"
    with open(path) as f:
        pointer = json.load(f)
    assert "active_model_name" in pointer
    assert "stage" in pointer
    assert "active_run_id" in pointer
    assert pointer["stage"] == "Production"
    assert pointer["active_model_name"] == "claim_severity_model"


def test_registry_metadata_exists():
    path = REPO_ROOT / "artifacts" / "governance" / "registry_metadata.json"
    assert path.is_file()


def test_registry_metadata_no_local_path():
    path = REPO_ROOT / "artifacts" / "governance" / "registry_metadata.json"
    with open(path) as f:
        metadata = json.load(f)
    tracking_uri = metadata.get("tracking_uri", "")
    assert "C:\\" not in tracking_uri, "tracking_uri must not contain a local Windows path"
    assert "C:/" not in tracking_uri, "tracking_uri must not contain a local Windows path"


def test_train_source_exists():
    assert (REPO_ROOT / "src" / "models" / "train.py").is_file()


def test_evaluate_source_exists():
    assert (REPO_ROOT / "src" / "models" / "evaluate.py").is_file()


def test_params_xgboost_config():
    with open(REPO_ROOT / "params.yaml") as f:
        params = yaml.safe_load(f)
    xgb = params["xgboost"]
    assert "n_estimators" in xgb
    assert "learning_rate" in xgb
    assert "max_depth" in xgb
    assert xgb["n_estimators"] > 0
    assert 0 < xgb["learning_rate"] < 1
    assert xgb["max_depth"] > 0


def test_version_history_exists():
    path = REPO_ROOT / "artifacts" / "governance" / "model_version_history.json"
    assert path.is_file()


def test_governance_model_card_exists():
    path = REPO_ROOT / "artifacts" / "governance" / "model_card.json"
    assert path.is_file()
