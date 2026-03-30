import json
import os


def build_feature_manifest(df, schema):
    """
    Builds feature manifest from training dataframe
    """

    categorical_prefix = schema["categorical_prefix"]
    numerical_prefix = schema["numerical_prefix"]
    target_column = schema["target_column"]
    id_column = schema["id_column"]

    categorical_features = [
        col for col in df.columns if col.startswith(categorical_prefix)
    ]

    numerical_features = [
        col for col in df.columns if col.startswith(numerical_prefix)
    ]

    manifest = {
        "target_column": target_column,
        "id_column": id_column,
        "categorical_features": categorical_features,
        "numerical_features": numerical_features,
        "total_features": len(df.columns)
    }

    return manifest


def save_feature_manifest(manifest, path="artifacts/feature_manifest.json"):
    os.makedirs("artifacts", exist_ok=True)

    with open(path, "w") as f:
        json.dump(manifest, f, indent=4)

    print("Feature manifest saved at:", path)