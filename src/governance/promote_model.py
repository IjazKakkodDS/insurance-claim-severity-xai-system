from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOVERNANCE_DIR = PROJECT_ROOT / "artifacts" / "governance"
GOVERNANCE_DIR.mkdir(parents=True, exist_ok=True)

PRODUCTION_POINTER_PATH = GOVERNANCE_DIR / "production_model_pointer.json"
REGISTRY_METADATA_PATH = GOVERNANCE_DIR / "registry_metadata.json"
VERSION_HISTORY_PATH = GOVERNANCE_DIR / "model_version_history.json"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)


def read_history(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)

    if isinstance(data, list):
        return data

    raise ValueError(f"Expected a list in {path}, but found {type(data).__name__}")


def write_history(path: Path, history: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as file:
        json.dump(history, file, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Promote a model version by updating the production pointer and version history."
    )
    parser.add_argument(
        "--model-name",
        required=True,
        help="Registered model name to promote, for example: claim_severity_model",
    )
    parser.add_argument(
        "--run-id",
        required=True,
        help="MLflow run ID of the model version being promoted",
    )
    parser.add_argument(
        "--stage",
        default="Production",
        help="Target stage name. Default is Production.",
    )
    parser.add_argument(
        "--version",
        default=None,
        help="Optional human-readable version label, for example: v2",
    )
    parser.add_argument(
        "--reason",
        default="Manual promotion",
        help="Why this promotion happened.",
    )
    parser.add_argument(
        "--promoted-by",
        default="manual_script",
        help="Who or what promoted this version.",
    )
    return parser.parse_args()


def build_new_pointer(
    model_name: str,
    run_id: str,
    stage: str,
    version: Optional[str],
) -> Dict[str, Any]:
    pointer: Dict[str, Any] = {
        "active_model_name": model_name,
        "active_run_id": run_id,
        "stage": stage,
        "updated_at_utc": utc_now_iso(),
    }

    if version:
        pointer["active_version"] = version

    return pointer


def build_history_entry(
    previous_pointer: Optional[Dict[str, Any]],
    new_pointer: Dict[str, Any],
    reason: str,
    promoted_by: str,
    registry_metadata: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    entry: Dict[str, Any] = {
        "event_type": "promotion",
        "timestamp_utc": utc_now_iso(),
        "promoted_by": promoted_by,
        "reason": reason,
        "from_model_name": previous_pointer.get("active_model_name") if previous_pointer else None,
        "from_run_id": previous_pointer.get("active_run_id") if previous_pointer else None,
        "from_stage": previous_pointer.get("stage") if previous_pointer else None,
        "from_version": previous_pointer.get("active_version") if previous_pointer else None,
        "to_model_name": new_pointer.get("active_model_name"),
        "to_run_id": new_pointer.get("active_run_id"),
        "to_stage": new_pointer.get("stage"),
        "to_version": new_pointer.get("active_version"),
    }

    if registry_metadata:
        entry["registry_metadata_snapshot"] = {
            "project_name": registry_metadata.get("project_name"),
            "model_file": registry_metadata.get("model_file"),
            "pipeline_file": registry_metadata.get("pipeline_file"),
            "registered_at_utc": registry_metadata.get("registered_at_utc"),
        }

    return entry


def promote_model(
    model_name: str,
    run_id: str,
    stage: str,
    version: Optional[str],
    reason: str,
    promoted_by: str,
) -> None:
    previous_pointer = read_json(PRODUCTION_POINTER_PATH)
    registry_metadata = read_json(REGISTRY_METADATA_PATH)

    new_pointer = build_new_pointer(
        model_name=model_name,
        run_id=run_id,
        stage=stage,
        version=version,
    )

    write_json(PRODUCTION_POINTER_PATH, new_pointer)

    history = read_history(VERSION_HISTORY_PATH)
    history_entry = build_history_entry(
        previous_pointer=previous_pointer,
        new_pointer=new_pointer,
        reason=reason,
        promoted_by=promoted_by,
        registry_metadata=registry_metadata,
    )
    history.append(history_entry)
    write_history(VERSION_HISTORY_PATH, history)

    print("=" * 70)
    print("Model promotion completed successfully.")
    print(f"Active model name : {new_pointer['active_model_name']}")
    print(f"Active run ID     : {new_pointer['active_run_id']}")
    print(f"Target stage      : {new_pointer['stage']}")
    if "active_version" in new_pointer:
        print(f"Version label     : {new_pointer['active_version']}")
    print(f"History file      : {VERSION_HISTORY_PATH}")
    print("=" * 70)

    if previous_pointer:
        print("Previous production pointer:")
        print(json.dumps(previous_pointer, indent=2))
        print("-" * 70)

    print("New production pointer:")
    print(json.dumps(new_pointer, indent=2))
    print("-" * 70)

    print("Latest history entry:")
    print(json.dumps(history_entry, indent=2))
    print("=" * 70)


if __name__ == "__main__":
    args = parse_args()
    promote_model(
        model_name=args.model_name,
        run_id=args.run_id,
        stage=args.stage,
        version=args.version,
        reason=args.reason,
        promoted_by=args.promoted_by,
    )