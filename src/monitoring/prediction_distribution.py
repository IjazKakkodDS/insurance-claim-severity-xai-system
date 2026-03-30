import json
import math
import os
from typing import Any, Dict, List


class PredictionDistributionService:
    def __init__(self, prediction_log_path: str = "logs/predictions.json"):
        self.prediction_log_path = prediction_log_path

    def _read_logs(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.prediction_log_path):
            return []

        try:
            with open(self.prediction_log_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                data = json.loads(content)
                return data if isinstance(data, list) else []
        except Exception:
            return []

    def _extract_predictions(self, logs: List[Dict[str, Any]]) -> List[float]:
        predictions = []

        for log in logs:
            value = log.get("prediction")
            if isinstance(value, (int, float)):
                predictions.append(float(value))

        return predictions

    def _mean(self, values: List[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    def _median(self, values: List[float]) -> float:
        if not values:
            return 0.0

        sorted_values = sorted(values)
        n = len(sorted_values)
        mid = n // 2

        if n % 2 == 0:
            return (sorted_values[mid - 1] + sorted_values[mid]) / 2
        return sorted_values[mid]

    def _std(self, values: List[float], mean_value: float) -> float:
        if not values:
            return 0.0

        variance = sum((x - mean_value) ** 2 for x in values) / len(values)
        return math.sqrt(variance)

    def _percentile(self, values: List[float], percentile: float) -> float:
        if not values:
            return 0.0

        sorted_values = sorted(values)
        if len(sorted_values) == 1:
            return sorted_values[0]

        index = (len(sorted_values) - 1) * percentile
        lower = math.floor(index)
        upper = math.ceil(index)

        if lower == upper:
            return sorted_values[int(index)]

        lower_value = sorted_values[lower]
        upper_value = sorted_values[upper]
        fraction = index - lower

        return lower_value + (upper_value - lower_value) * fraction

    def _build_histogram(self, values: List[float], num_buckets: int = 5) -> List[Dict[str, Any]]:
        if not values:
            return []

        min_value = min(values)
        max_value = max(values)

        if min_value == max_value:
            return [
                {
                    "range_start": round(min_value, 6),
                    "range_end": round(max_value, 6),
                    "count": len(values),
                }
            ]

        bucket_width = (max_value - min_value) / num_buckets
        buckets = []

        for i in range(num_buckets):
            start = min_value + i * bucket_width
            end = min_value + (i + 1) * bucket_width

            if i == num_buckets - 1:
                count = sum(1 for v in values if start <= v <= end)
            else:
                count = sum(1 for v in values if start <= v < end)

            buckets.append(
                {
                    "range_start": round(start, 6),
                    "range_end": round(end, 6),
                    "count": count,
                }
            )

        return buckets

    def get_distribution_summary(self) -> Dict[str, Any]:
        logs = self._read_logs()
        predictions = self._extract_predictions(logs)

        if not predictions:
            return {
                "status": "insufficient_data",
                "message": "No prediction logs found.",
                "distribution": None,
            }

        mean_value = self._mean(predictions)
        median_value = self._median(predictions)
        std_value = self._std(predictions, mean_value)

        p25 = self._percentile(predictions, 0.25)
        p75 = self._percentile(predictions, 0.75)

        recent_predictions = predictions[-5:]

        return {
            "status": "success",
            "distribution": {
                "total_predictions": len(predictions),
                "min_prediction": round(min(predictions), 6),
                "max_prediction": round(max(predictions), 6),
                "mean_prediction": round(mean_value, 6),
                "median_prediction": round(median_value, 6),
                "std_prediction": round(std_value, 6),
                "p25_prediction": round(p25, 6),
                "p75_prediction": round(p75, 6),
                "recent_predictions": [round(x, 6) for x in recent_predictions],
                "histogram": self._build_histogram(predictions, num_buckets=5),
            },
        }