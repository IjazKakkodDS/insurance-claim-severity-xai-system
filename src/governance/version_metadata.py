import os
import json
from datetime import datetime

import yaml


class VersionMetadataGenerator:
    def __init__(self):
        self.params_path = "params.yaml"
        self.model_metrics_path = "reports/model_metrics.json"
        self.evaluation_report_path = "reports/evaluation_report.json"
        self.output_dir = "artifacts/governance"
        self.output_path = os.path.join(self.output_dir, "version_metadata.json")

        os.makedirs(self.output_dir, exist_ok=True)

    def _load_json(self, path: str) -> dict:
        if not os.path.exists(path):
            return {}

        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _load_params(self) -> dict:
        if not os.path.exists(self.params_path):
            return {}

        with open(self.params_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def generate(self) -> dict:
        params = self._load_params()
        model_metrics = self._load_json(self.model_metrics_path)
        evaluation_report = self._load_json(self.evaluation_report_path)

        best_model_name = model_metrics.get("best_model", "unknown")
        best_model_metrics = model_metrics.get("metrics", {})
        evaluation_metrics = evaluation_report if isinstance(evaluation_report, dict) else {}

        metadata = {
            "project_name": "Explainable Insurance Claim Severity ML System",
            "project_type": "Production-grade regression ML system with explainability and monitoring",
            "artifact_name": "version_metadata",
            "artifact_version": "v1.0.0",
            "generated_at_utc": datetime.utcnow().isoformat(),
            "model_summary": {
                "selected_model_name": best_model_name,
                "task_type": "regression",
                "target_description": "insurance claim severity prediction",
                "best_model_path": "models/best_model.pkl",
                "feature_pipeline_path": "models/feature_pipeline.pkl"
            },
            "training_summary": {
                "candidate_models": [
                    "LinearRegression",
                    "RandomForest",
                    "XGBoost"
                ],
                "training_data_paths": {
                    "x_train": "data/features/X_train.csv",
                    "x_valid": "data/features/X_valid.csv",
                    "y_train": "data/features/y_train.csv",
                    "y_valid": "data/features/y_valid.csv"
                },
                "params_used": params
            },
            "performance_summary": {
                "model_selection_metrics": best_model_metrics,
                "evaluation_metrics": evaluation_metrics
            },
            "monitoring_summary": {
                "prediction_log_path": "logs/predictions.json",
                "explanation_log_path": "logs/explanations.json",
                "baseline_stats_path": "artifacts/baseline_stats.json",
                "evidently_report_dir": "reports/evidently"
            },
            "governance_artifact_paths": {
                "model_metrics_report": "reports/model_metrics.json",
                "evaluation_report": "reports/evaluation_report.json",
                "residual_plot": "reports/residual_plot.png",
                "error_distribution_plot": "reports/error_distribution.png",
                "feature_manifest": "artifacts/feature_manifest.json",
                "run_id_file": "artifacts/run_id.txt"
            }
        }

        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)

        return metadata


if __name__ == "__main__":
    generator = VersionMetadataGenerator()
    metadata = generator.generate()
    print("Version metadata artifact generated successfully.")
    print(json.dumps(metadata, indent=4))