from typing import Dict, List

def get_schema() -> Dict:
    """
    Defines expected schema for training data.
    """

    schema = {
        "target_column": "loss",

        "categorical_prefix": "cat",
        "numerical_prefix": "cont",

        "id_column": "id",

        "expected_min_columns": 100,   # sanity check
        "expected_max_columns": 2000,  # safety check

        "null_threshold": 0.3,  # 30%
        "duplicate_threshold": 0.05,  # 5%

    }

    return schema