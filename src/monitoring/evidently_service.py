import os
import json
from datetime import datetime

import pandas as pd
from evidently import Report
from evidently.presets import DataDriftPreset


class EvidentlyService:
    def __init__(self):
        self.prediction_log_path = "logs/predictions.json"
        self.baseline_path = "artifacts/baseline_stats.json"
        self.output_dir = "reports/evidently"
        os.makedirs(self.output_dir, exist_ok=True)

    def _load_predictions(self) -> pd.DataFrame:
        if not os.path.exists(self.prediction_log_path):
            raise ValueError("Prediction log file not found")

        with open(self.prediction_log_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list) or len(data) == 0:
            raise ValueError("Prediction log is empty")

        records = []
        for entry in data:
            row = {}

            input_features = entry.get("input", {})
            if isinstance(input_features, dict):
                row.update(input_features)

            row["prediction"] = entry.get("prediction")
            records.append(row)

        current_df = pd.DataFrame(records)

        if current_df.empty:
            raise ValueError("No valid prediction records found in prediction log")

        return current_df

    def _load_baseline(self) -> pd.DataFrame:
        if not os.path.exists(self.baseline_path):
            raise ValueError("Baseline stats file not found")

        with open(self.baseline_path, "r", encoding="utf-8") as f:
            baseline_stats = json.load(f)

        feature_stats = baseline_stats.get("feature_stats", {})
        prediction_stats = baseline_stats.get("prediction_stats", {})

        if not isinstance(feature_stats, dict) or len(feature_stats) == 0:
            raise ValueError("Baseline feature_stats missing or invalid in baseline_stats.json")

        prediction_mean = prediction_stats.get("mean", 0)

        rows = []
        for _ in range(50):
            row = {}

            for feature_name, stats in feature_stats.items():
                if isinstance(stats, dict):
                    row[feature_name] = stats.get("mean", 0)

            row["prediction"] = prediction_mean
            rows.append(row)

        reference_df = pd.DataFrame(rows)

        if reference_df.empty:
            raise ValueError("Baseline reference dataset could not be created")

        return reference_df

    def _align_reference_to_current(
        self,
        reference_df: pd.DataFrame,
        current_df: pd.DataFrame
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        current_columns = list(current_df.columns)

        for col in current_columns:
            if col not in reference_df.columns:
                if pd.api.types.is_numeric_dtype(current_df[col]):
                    reference_df[col] = 0.0
                else:
                    reference_df[col] = "missing_baseline"

        reference_df = reference_df[current_columns]

        for col in current_columns:
            if pd.api.types.is_numeric_dtype(current_df[col]):
                current_df[col] = pd.to_numeric(current_df[col], errors="coerce")
                reference_df[col] = pd.to_numeric(reference_df[col], errors="coerce")
            else:
                current_df[col] = current_df[col].astype(str)
                reference_df[col] = reference_df[col].astype(str)

        current_df = current_df.fillna(0)
        reference_df = reference_df.fillna(0)

        return reference_df, current_df

    def generate_report(self) -> dict:
        current_df = self._load_predictions()
        reference_df = self._load_baseline()

        reference_df, current_df = self._align_reference_to_current(
            reference_df=reference_df,
            current_df=current_df
        )

        report = Report([
            DataDriftPreset()
        ])

        evaluation = report.run(
            current_data=current_df,
            reference_data=reference_df
        )

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_path = os.path.join(
            self.output_dir,
            f"evidently_report_{timestamp}.html"
        )

        evaluation.save_html(report_path)

        return {
            "status": "success",
            "report_path": report_path,
            "generated_at": timestamp,
            "current_rows": int(len(current_df)),
            "reference_rows": int(len(reference_df)),
            "columns_compared": list(current_df.columns),
        }