# MLOps Readiness Assessment

Explainable Insurance Claim Severity System · Source: [artifacts/governance/governance_report.json](../artifacts/governance/governance_report.json), [artifacts/governance/RESPONSIBLE_AI.md](../artifacts/governance/RESPONSIBLE_AI.md), [dvc.yaml](../dvc.yaml), [src/api/main.py](../src/api/main.py)

This document assesses the platform's operational maturity against standard MLOps dimensions: reproducibility, versioning, serving, monitoring, governance, testing, and security. It reflects the system as built, not an aspirational target.

---

## Reproducibility

| Capability | Status |
|---|---|
| Pipeline orchestration | DVC, 6 explicit stages: `data_ingestion → data_validation → feature_engineering → model_training → model_evaluation → model_explainability` |
| Stage-level caching | Yes — DVC reruns only downstream stages when an upstream dependency changes |
| Training parameters tracked | Yes — `params.yaml` (XGBoost: `n_estimators=200`, `learning_rate=0.05`, `max_depth=6`, `subsample=0.8`, `colsample_bytree=0.8`, `test_size=0.2`, `random_state=42`) |
| Dependency pinning | Partial — `requirements.txt` pins only `scikit-learn==1.6.1`; other dependencies are unpinned |

## Experiment Tracking and Versioning

| Capability | Status |
|---|---|
| Experiment lineage | MLflow — run parameters, metrics, and artifacts logged per training run |
| Model registry | Custom file-based layer extending MLflow: `registry_metadata.json`, `production_model_pointer.json`, `model_version_history.json` |
| Promotion / rollback traceability | Yes — every promotion and rollback event is appended to `model_version_history.json` with timestamp and actor |
| Serving decoupled from MLflow runtime | Yes — the serving layer reads only the file-based production pointer, not the MLflow tracking server |

## Data Validation

| Check | Result |
|---|---|
| Row / column count | 188,318 rows, 132 columns — within expected range |
| Null check | Passed (0.0 null ratio across all columns) |
| Duplicate check | Passed (0.0 duplicate ratio) |
| Type check | Passed |
| Target check | Passed |
| Overall | Passed |

Source: `artifacts/governance/governance_report.json` → `data_governance.validation_summary`.

## Serving

| Capability | Status |
|---|---|
| Framework | FastAPI, stateless (model + pipeline loaded from disk on startup) |
| Hot path (`/predict`, `/explain`) | Synchronous, latency logged per request |
| Cold path (`/monitoring/*`, `/model-info`) | On-demand, artifact-driven, isolated from hot-path latency |
| Containerization | Docker (`Dockerfile`, `docker/Dockerfile`) |
| Deployment | Render (backend), Vercel (frontend) — both currently live |

## Monitoring

| Capability | Status |
|---|---|
| Prediction / explanation logging | Per-request, to `logs/predictions.json` / `logs/explanations.json` |
| Drift detection | Implemented — lightweight baseline comparison |
| Distribution analysis | Implemented |
| Structured reporting | Evidently HTML reports (`reports/evidently/`) |
| Monitoring baseline | **Synthetic**, not historical — this is a known limitation, not yet remediated |

## Governance

| Capability | Status |
|---|---|
| Model card | Yes — machine-readable (`artifacts/governance/model_card.json`) and human-readable (`docs/MODEL_CARD.md`) |
| Responsible AI documentation | Yes (`artifacts/governance/RESPONSIBLE_AI.md`) |
| Explainability documentation | Yes (`artifacts/governance/EXPLAINABILITY.md`) |
| Governance UI | Yes — reads file-based artifacts directly, no MLflow UI dependency at runtime |
| Executable approval gate | **No** — governance controls are operator-facing review surfaces, not an enforced workflow |

## Testing and CI

| Capability | Status |
|---|---|
| Unit tests | `tests/test_data_pipeline.py`, `tests/test_feature_pipeline.py`, `tests/test_model_training.py` |
| API / explainability / monitoring test coverage | Not yet present |
| Continuous integration | `.github/workflows/ci.yml` — installs dependencies and runs the existing pytest suite on push/PR (lightweight gate; does not cover API routes) |

## Security and Privacy

Per `artifacts/governance/RESPONSIBLE_AI.md`, the following are **not yet implemented** and are required before any real production use:

- Authentication / access control
- Rate limiting
- Secure/sanitized logging review
- Secure model artifact storage
- Formal data privacy governance review

CORS currently defaults to allow-all (`*`) unless `FRONTEND_URL` is set in the deployment environment.

## Fairness and Robustness

Not yet implemented:
- Subgroup / fairness analysis
- Adversarial or abuse-case input testing
- Formal bias assessment

## Overall Assessment

Per the governance report's own deployment decision record:

> **Current status: `portfolio_ready_not_production_approved`**
> Core ML system architecture, monitoring, and explainability are implemented. Data validation exists and is reportable. Responsible AI controls are partially implemented but not fully complete.

This system is appropriate as a live, interactive portfolio demonstration of end-to-end ML lifecycle engineering. It is **not** approved, and does not claim to be approved, for live insurance claim decisions. The gaps above (fairness testing, historical monitoring baseline, executable approval workflow, security hardening) are the concrete, named path to production readiness — not undiscovered unknowns.
