import json
import yaml
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent


def test_dvc_yaml_exists():
    assert (REPO_ROOT / "dvc.yaml").is_file()


def test_dvc_yaml_has_expected_stages():
    with open(REPO_ROOT / "dvc.yaml") as f:
        pipeline = yaml.safe_load(f)
    stages = pipeline.get("stages", {})
    expected = {"data_ingestion", "data_validation", "feature_engineering", "model_training", "model_evaluation"}
    assert expected.issubset(set(stages.keys()))


def test_params_yaml_exists():
    assert (REPO_ROOT / "params.yaml").is_file()


def test_params_yaml_has_required_sections():
    with open(REPO_ROOT / "params.yaml") as f:
        params = yaml.safe_load(f)
    assert "model" in params
    assert "xgboost" in params
    assert "training" in params


def test_feature_manifest_exists():
    assert (REPO_ROOT / "artifacts" / "feature_manifest.json").is_file()


def test_feature_manifest_is_valid_json():
    path = REPO_ROOT / "artifacts" / "feature_manifest.json"
    with open(path) as f:
        manifest = json.load(f)
    assert "target_column" in manifest
    assert "categorical_features" in manifest
    assert "numerical_features" in manifest
    assert manifest["target_column"] == "loss"


def test_feature_manifest_feature_counts():
    path = REPO_ROOT / "artifacts" / "feature_manifest.json"
    with open(path) as f:
        manifest = json.load(f)
    assert len(manifest["categorical_features"]) > 0
    assert len(manifest["numerical_features"]) > 0
    assert manifest["total_features"] == 132


def test_baseline_stats_exists():
    assert (REPO_ROOT / "artifacts" / "baseline_stats.json").is_file()


def test_baseline_stats_is_valid_json():
    path = REPO_ROOT / "artifacts" / "baseline_stats.json"
    with open(path) as f:
        stats = json.load(f)
    assert "prediction_stats" in stats
    assert "mean" in stats["prediction_stats"]


def test_schema_module_importable():
    from src.data.schema import get_schema
    schema = get_schema()
    assert schema["target_column"] == "loss"
    assert "categorical_prefix" in schema
    assert "numerical_prefix" in schema
    assert schema["categorical_prefix"] == "cat"
    assert schema["numerical_prefix"] == "cont"


def test_validation_utils_importable():
    from src.data.validation_utils import check_column_bounds, check_nulls, check_duplicates
    assert callable(check_column_bounds)
    assert callable(check_nulls)
    assert callable(check_duplicates)


def test_ingest_source_exists():
    assert (REPO_ROOT / "src" / "data" / "ingest_data.py").is_file()
