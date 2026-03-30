import json
import os
from typing import Any, Dict


class MonitoringService:
    def __init__(
        self,
        prediction_log_path: str = "logs/predictions.json",
        explain_log_path: str = "logs/explanations.json",
    ):
        self.prediction_log_path = prediction_log_path
        self.explain_log_path = explain_log_path

    def _read_logs(self, path: str):
        if not os.path.exists(path):
            return []

        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except Exception:
            return []

    def get_summary(self) -> Dict[str, Any]:
        prediction_logs = self._read_logs(self.prediction_log_path)
        explain_logs = self._read_logs(self.explain_log_path)

        total_predictions = len(prediction_logs)
        total_explanations = len(explain_logs)

        avg_prediction_latency = (
            sum(log["latency_ms"] for log in prediction_logs if log.get("latency_ms") is not None)
            / total_predictions
            if total_predictions > 0
            else 0
        )

        avg_explain_latency = (
            sum(log["latency_ms"] for log in explain_logs if log.get("latency_ms") is not None)
            / total_explanations
            if total_explanations > 0
            else 0
        )

        latest_prediction = prediction_logs[-1] if total_predictions > 0 else None
        latest_explanation = explain_logs[-1] if total_explanations > 0 else None

        return {
            "prediction_metrics": {
                "total_requests": total_predictions,
                "avg_latency_ms": round(avg_prediction_latency, 2),
                "latest_prediction": latest_prediction,
            },
            "explanation_metrics": {
                "total_requests": total_explanations,
                "avg_latency_ms": round(avg_explain_latency, 2),
                "latest_explanation": latest_explanation,
            },
            "system_health": {
                "status": "healthy",
                "logs_present": {
                    "predictions_log": os.path.exists(self.prediction_log_path),
                    "explanations_log": os.path.exists(self.explain_log_path),
                },
            },
        }