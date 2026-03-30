import json
import math
import os
from typing import Any, Dict, List


class DriftDetectionService:
    def __init__(
        self,
        prediction_log_path: str = "logs/predictions.json",
        baseline_stats_path: str = "artifacts/baseline_stats.json",
        prediction_drift_threshold: float = 0.20,
        feature_drift_threshold: float = 0.30,
    ):
        self.prediction_log_path = prediction_log_path
        self.baseline_stats_path = baseline_stats_path
        self.prediction_drift_threshold = prediction_drift_threshold
        self.feature_drift_threshold = feature_drift_threshold

    def _read_json(self, path: str):
        if not os.path.exists(path):
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return None
                return json.loads(content)
        except Exception:
            return None

    def _extract_prediction_logs(self) -> List[Dict[str, Any]]:
        logs = self._read_json(self.prediction_log_path)
        if not logs or not isinstance(logs, list):
            return []
        return logs

    def _safe_mean(self, values: List[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    def _safe_std(self, values: List[float], mean_value: float) -> float:
        if not values:
            return 0.0
        variance = sum((x - mean_value) ** 2 for x in values) / len(values)
        return math.sqrt(variance)

    def _relative_change(self, baseline: float, current: float) -> float:
        if baseline == 0:
            return abs(current)
        return abs(current - baseline) / abs(baseline)

    def _collect_current_stats(self, logs: List[Dict[str, Any]]) -> Dict[str, Any]:
        predictions = []
        numeric_feature_values: Dict[str, List[float]] = {}

        for log in logs:
            prediction = log.get("prediction")
            if isinstance(prediction, (int, float)):
                predictions.append(float(prediction))

            input_features = log.get("input", {})
            if isinstance(input_features, dict):
                for feature_name, value in input_features.items():
                    if isinstance(value, (int, float)):
                        numeric_feature_values.setdefault(feature_name, []).append(float(value))

        prediction_mean = self._safe_mean(predictions)
        prediction_std = self._safe_std(predictions, prediction_mean)

        feature_stats = {}
        for feature_name, values in numeric_feature_values.items():
            mean_value = self._safe_mean(values)
            std_value = self._safe_std(values, mean_value)
            feature_stats[feature_name] = {
                "mean": round(mean_value, 6),
                "std": round(std_value, 6),
                "count": len(values),
            }

        return {
            "prediction_stats": {
                "mean": round(prediction_mean, 6),
                "std": round(prediction_std, 6),
                "count": len(predictions),
            },
            "feature_stats": feature_stats,
        }

    def detect_drift(self) -> Dict[str, Any]:
        logs = self._extract_prediction_logs()

        if not logs:
            return {
                "status": "insufficient_data",
                "message": "No prediction logs found.",
                "prediction_drift": None,
                "feature_drift": {},
            }

        baseline_stats = self._read_json(self.baseline_stats_path)

        if not baseline_stats:
            return {
                "status": "baseline_missing",
                "message": "Baseline stats file not found. Create artifacts/baseline_stats.json first.",
                "prediction_drift": None,
                "feature_drift": {},
                "current_stats": self._collect_current_stats(logs),
            }

        current_stats = self._collect_current_stats(logs)

        baseline_prediction_mean = baseline_stats.get("prediction_stats", {}).get("mean", 0.0)
        current_prediction_mean = current_stats.get("prediction_stats", {}).get("mean", 0.0)

        prediction_drift_score = self._relative_change(
            baseline_prediction_mean,
            current_prediction_mean,
        )
        prediction_drift_detected = prediction_drift_score > self.prediction_drift_threshold

        feature_drift_results = {}
        baseline_feature_stats = baseline_stats.get("feature_stats", {})
        current_feature_stats = current_stats.get("feature_stats", {})

        for feature_name, current_feature in current_feature_stats.items():
            baseline_feature = baseline_feature_stats.get(feature_name)

            if not baseline_feature:
                feature_drift_results[feature_name] = {
                    "status": "no_baseline",
                    "drift_score": None,
                    "drift_detected": None,
                    "baseline_mean": None,
                    "current_mean": current_feature["mean"],
                }
                continue

            baseline_mean = baseline_feature.get("mean", 0.0)
            current_mean = current_feature.get("mean", 0.0)

            drift_score = self._relative_change(baseline_mean, current_mean)
            drift_detected = drift_score > self.feature_drift_threshold

            feature_drift_results[feature_name] = {
                "status": "ok",
                "drift_score": round(drift_score, 6),
                "drift_detected": drift_detected,
                "baseline_mean": baseline_mean,
                "current_mean": current_mean,
            }

        return {
            "status": "success",
            "prediction_drift": {
                "baseline_mean": baseline_prediction_mean,
                "current_mean": current_prediction_mean,
                "drift_score": round(prediction_drift_score, 6),
                "drift_detected": prediction_drift_detected,
                "threshold": self.prediction_drift_threshold,
            },
            "feature_drift": feature_drift_results,
            "current_stats": current_stats,
        }