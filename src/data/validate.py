import pandas as pd
import os
import json

from src.data.schema import get_schema
from src.data.validation_utils import (
    check_column_bounds,
    check_nulls,
    check_duplicates,
    check_column_types,
    check_target
)


PROCESSED_DATA_PATH = "data/processed/train_processed.csv"
REPORT_PATH = "data/validation_reports/validation_report.json"


def convert_to_serializable(obj):
    import numpy as np

    if isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(v) for v in obj]
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    else:
        return obj


def validate_data():

    print("Starting advanced data validation...")

    # Load schema
    schema = get_schema()

    # Load data
    df = pd.read_csv(PROCESSED_DATA_PATH)

    validation_report = {}

    # Basic info
    validation_report["rows"] = df.shape[0]
    validation_report["columns"] = df.shape[1]

    # Advanced validation
    validation_report["column_check"] = check_column_bounds(df, schema)
    validation_report["null_check"] = check_nulls(df, schema)
    validation_report["duplicate_check"] = check_duplicates(df, schema)
    validation_report["type_check"] = check_column_types(df, schema)
    validation_report["target_check"] = check_target(df, schema)

    # Overall status
    validation_report["overall_passed"] = all([
        validation_report["column_check"]["within_expected_range"],
        validation_report["null_check"]["passed"],
        validation_report["duplicate_check"]["passed"],
        validation_report["type_check"]["passed"],
        validation_report["target_check"]["passed"]
    ])

    # Save report
    os.makedirs("data/validation_reports", exist_ok=True)

    serializable_report = convert_to_serializable(validation_report)

    with open(REPORT_PATH, "w") as f:
        json.dump(serializable_report, f, indent=4)

    # Logs
    print("Validation completed.")
    print("Report saved at:", REPORT_PATH)

    if validation_report["overall_passed"]:
        print("STATUS: PASSED")
    else:
        print("STATUS: FAILED")


if __name__ == "__main__":
    validate_data()