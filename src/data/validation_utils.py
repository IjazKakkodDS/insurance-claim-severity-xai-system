import pandas as pd


def check_column_bounds(df: pd.DataFrame, schema: dict) -> dict:
    n_cols = df.shape[1]

    return {
        "column_count": n_cols,
        "within_expected_range": schema["expected_min_columns"] <= n_cols <= schema["expected_max_columns"]
    }


def check_nulls(df: pd.DataFrame, schema: dict) -> dict:
    null_ratios = df.isnull().mean().to_dict()

    high_null_columns = {
        col: ratio for col, ratio in null_ratios.items()
        if ratio > schema["null_threshold"]
    }

    return {
        "null_ratios": null_ratios,
        "high_null_columns": high_null_columns,
        "passed": len(high_null_columns) == 0
    }


def check_duplicates(df: pd.DataFrame, schema: dict) -> dict:
    duplicate_ratio = df.duplicated().mean()

    return {
        "duplicate_ratio": duplicate_ratio,
        "passed": duplicate_ratio <= schema["duplicate_threshold"]
    }


def check_column_types(df: pd.DataFrame, schema: dict) -> dict:
    categorical_prefix = schema["categorical_prefix"]
    numerical_prefix = schema["numerical_prefix"]

    issues = []

    for col in df.columns:
        if col.startswith(categorical_prefix):
            if not df[col].dtype == "object":
                issues.append(f"{col} expected categorical but got {df[col].dtype}")

        if col.startswith(numerical_prefix):
            if not pd.api.types.is_numeric_dtype(df[col]):
                issues.append(f"{col} expected numerical but got {df[col].dtype}")

    return {
        "issues": issues,
        "passed": len(issues) == 0
    }


def check_target(df: pd.DataFrame, schema: dict) -> dict:
    target = schema["target_column"]

    if target not in df.columns:
        return {"passed": False, "error": "Target column missing"}

    if not pd.api.types.is_numeric_dtype(df[target]):
        return {"passed": False, "error": "Target is not numeric"}

    return {"passed": True}