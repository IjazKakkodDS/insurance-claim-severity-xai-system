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
        raise FileNotFoundError(f"Version history file not found: {path}")

    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError(f"Expected a list in {path}, but found {type(data).__name__}")

    return data


def write_history(path: Path, history: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as file:
        json.dump(history, file, indent=2)


def pointers_equal(a: Optional[Dict[str, Any]], b: Optional[Dict[str, Any]]) -> bool:
    if a is None or b is None:
        return False

    return (
        a.get("active_model_name") == b.get("active_model_name")
        and a.get("active_run_id") == b.get("active_run_id")
        and a.get("stage") == b.get("stage")
        and a.get("active_version") == b.get("active_version")
    )


def build_pointer(
    model_name: Optional[str],
    run_id: Optional[str],
    stage: Optional[str],
    version: Optional[str],
) -> Optional[Dict[str, Any]]:
    if not model_name or not run_id or not stage:
        return None

    pointer: Dict[str, Any] = {
        "active_model_name": model_name,
        "active_run_id": run_id,
        "stage": stage,
        "updated_at_utc": utc_now_iso(),
    }

    if version:
        pointer["active_version"] = version

    return pointer


def find_previous_distinct_state(
    history: List[Dict[str, Any]],
    current_pointer: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Find the most recent valid previous state that is genuinely different
    from the current production pointer.
    """
    for entry in reversed(history):
        candidate_pointer = build_pointer(
            model_name=entry.get("from_model_name"),
            run_id=entry.get("from_run_id"),
            stage=entry.get("from_stage"),
            version=entry.get("from_version"),
        )

        if candidate_pointer is None:
            continue

        if not pointers_equal(candidate_pointer, current_pointer):
            return candidate_pointer

    raise ValueError(
        "No previous distinct production state found in version history. "
        "A real rollback requires at least one earlier promoted state."
    )


def build_rollback_history_entry(
    previous_pointer: Dict[str, Any],
    rollback_pointer: Dict[str, Any],
    reason: str,
    rolled_back_by: str,
) -> Dict[str, Any]:
    return {
        "event_type": "rollback",
        "timestamp_utc": utc_now_iso(),
        "rolled_back_by": rolled_back_by,
        "reason": reason,
        "from_model_name": previous_pointer.get("active_model_name"),
        "from_run_id": previous_pointer.get("active_run_id"),
        "from_stage": previous_pointer.get("stage"),
        "from_version": previous_pointer.get("active_version"),
        "to_model_name": rollback_pointer.get("active_model_name"),
        "to_run_id": rollback_pointer.get("active_run_id"),
        "to_stage": rollback_pointer.get("stage"),
        "to_version": rollback_pointer.get("active_version"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Rollback the production pointer to the most recent distinct previous state."
    )
    parser.add_argument(
        "--reason",
        default="Manual rollback",
        help="Why this rollback happened.",
    )
    parser.add_argument(
        "--rolled-back-by",
        default="manual_script",
        help="Who or what performed the rollback.",
    )
    return parser.parse_args()


def rollback_model(reason: str, rolled_back_by: str) -> None:
    current_pointer = read_json(PRODUCTION_POINTER_PATH)
    if current_pointer is None:
        raise FileNotFoundError(
            f"Production pointer file not found: {PRODUCTION_POINTER_PATH}"
        )

    history = read_history(VERSION_HISTORY_PATH)
    rollback_pointer = find_previous_distinct_state(
        history=history,
        current_pointer=current_pointer,
    )

    previous_pointer = current_pointer
    write_json(PRODUCTION_POINTER_PATH, rollback_pointer)

    rollback_entry = build_rollback_history_entry(
        previous_pointer=previous_pointer,
        rollback_pointer=rollback_pointer,
        reason=reason,
        rolled_back_by=rolled_back_by,
    )
    history.append(rollback_entry)
    write_history(VERSION_HISTORY_PATH, history)

    print("=" * 70)
    print("Model rollback completed successfully.")
    print(f"Rolled back to model name : {rollback_pointer['active_model_name']}")
    print(f"Rolled back to run ID     : {rollback_pointer['active_run_id']}")
    print(f"Rolled back to stage      : {rollback_pointer['stage']}")
    if "active_version" in rollback_pointer:
        print(f"Rolled back to version    : {rollback_pointer['active_version']}")
    print("=" * 70)

    print("Previous production pointer:")
    print(json.dumps(previous_pointer, indent=2))
    print("-" * 70)

    print("Rollback target pointer:")
    print(json.dumps(rollback_pointer, indent=2))
    print("-" * 70)

    print("Latest history entry:")
    print(json.dumps(rollback_entry, indent=2))
    print("=" * 70)


if __name__ == "__main__":
    args = parse_args()
    rollback_model(
        reason=args.reason,
        rolled_back_by=args.rolled_back_by,
    )