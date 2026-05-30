import json
import inspect
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent


def test_feature_pipeline_artifact_exists():
    assert (REPO_ROOT / "models" / "feature_pipeline.pkl").is_file()


def test_feature_pipeline_artifact_non_empty():
    path = REPO_ROOT / "models" / "feature_pipeline.pkl"
    assert path.stat().st_size > 0


def test_feature_manifest_categorical_features():
    path = REPO_ROOT / "artifacts" / "feature_manifest.json"
    with open(path) as f:
        manifest = json.load(f)
    cats = manifest["categorical_features"]
    assert isinstance(cats, list)
    assert len(cats) == 116
    assert "cat1" in cats
    assert "cat116" in cats


def test_feature_manifest_numerical_features():
    path = REPO_ROOT / "artifacts" / "feature_manifest.json"
    with open(path) as f:
        manifest = json.load(f)
    nums = manifest["numerical_features"]
    assert isinstance(nums, list)
    assert len(nums) == 14
    assert "cont1" in nums
    assert "cont14" in nums


def test_feature_manifest_total_columns():
    path = REPO_ROOT / "artifacts" / "feature_manifest.json"
    with open(path) as f:
        manifest = json.load(f)
    # total_features reflects all dataset columns (features + id + target)
    assert manifest["total_features"] == 132
    # feature lists sum to 130; id and target account for the remaining 2
    cat_count = len(manifest["categorical_features"])
    num_count = len(manifest["numerical_features"])
    assert cat_count + num_count <= manifest["total_features"]


def test_feature_manifest_module_importable():
    from src.features.feature_manifest import build_feature_manifest, save_feature_manifest
    assert callable(build_feature_manifest)
    assert callable(save_feature_manifest)


def test_feature_manifest_build_function_signature():
    from src.features.feature_manifest import build_feature_manifest
    sig = inspect.signature(build_feature_manifest)
    params = list(sig.parameters.keys())
    assert "df" in params
    assert "schema" in params


def test_feature_engineering_source_exists():
    assert (REPO_ROOT / "src" / "features" / "feature_engineering.py").is_file()


def test_schema_categorical_prefix_matches_manifest():
    from src.data.schema import get_schema
    schema = get_schema()
    path = REPO_ROOT / "artifacts" / "feature_manifest.json"
    with open(path) as f:
        manifest = json.load(f)
    prefix = schema["categorical_prefix"]
    for col in manifest["categorical_features"]:
        assert col.startswith(prefix), f"{col} does not start with expected prefix '{prefix}'"


def test_schema_numerical_prefix_matches_manifest():
    from src.data.schema import get_schema
    schema = get_schema()
    path = REPO_ROOT / "artifacts" / "feature_manifest.json"
    with open(path) as f:
        manifest = json.load(f)
    prefix = schema["numerical_prefix"]
    for col in manifest["numerical_features"]:
        assert col.startswith(prefix), f"{col} does not start with expected prefix '{prefix}'"
