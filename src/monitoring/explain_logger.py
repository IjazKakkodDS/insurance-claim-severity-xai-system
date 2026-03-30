import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class ExplainLogger:
    def __init__(self, log_path: str = "logs/explanations.json"):
        self.log_path = log_path
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

        if not os.path.exists(self.log_path):
            with open(self.log_path, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)

    def _read_logs(self) -> list:
        try:
            with open(self.log_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _write_logs(self, logs: list) -> None:
        with open(self.log_path, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2)

    def _make_json_safe(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {str(k): self._make_json_safe(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._make_json_safe(v) for v in value]
        if isinstance(value, tuple):
            return [self._make_json_safe(v) for v in value]
        if hasattr(value, "tolist"):
            try:
                return value.tolist()
            except Exception:
                return str(value)
        if hasattr(value, "item"):
            try:
                return value.item()
            except Exception:
                return str(value)
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(value)

    def log_explanation(
        self,
        request_id: str,
        input_features: Dict[str, Any],
        prediction: float,
        explanation: Dict[str, float],
        latency_ms: Optional[float] = None,
    ) -> Dict[str, Any]:
        logs = self._read_logs()

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": request_id,
            "input": self._make_json_safe(input_features),
            "prediction": self._make_json_safe(prediction),
            "top_features": self._make_json_safe(explanation),
            "latency_ms": round(float(latency_ms), 2) if latency_ms is not None else None,
        }

        logs.append(log_entry)
        self._write_logs(logs)

        return log_entry