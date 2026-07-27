# Portfolio Case Study — Explainable Insurance Claim Severity System

## The Problem

Insurance claim severity estimation feeds directly into reserve planning, case triage, and escalation routing. A severity model that only outputs a number is operationally incomplete: it cannot be reviewed, audited, monitored, or governed. In practice, a severity system fails operationally — regardless of its held-out accuracy — if individual predictions can't be interpreted at runtime, if dominant cost drivers can't be surfaced per claim, if distribution shift goes undetected after deployment, or if the active model version has no audit-accessible lineage.

## What Was Built

An end-to-end platform that treats prediction, explainability, monitoring, and governance as one connected system rather than four separate tools:

- **Severity prediction** — XGBoost, selected from five candidates (Linear Regression, Ridge, Random Forest, Gradient Boosting, XGBoost) on MAE, RMSE, and R², trained on the Allstate Claim Severity dataset (188,318 rows, 132 features).
- **Explainability** — SHAP TreeExplainer exposed as a live API service (`/explain`), not a static training artifact, supporting per-request attribution and before/after counterfactual comparison.
- **Monitoring** — a custom decision layer (stability score, escalation guidance) running alongside Evidently-generated structured HTML reports.
- **Governance** — MLflow experiment lineage extended with a custom file-based production pointer, registry metadata, and version history, so lifecycle state is readable without live MLflow access.
- **Product interface** — a five-surface Next.js frontend (Overview, Scoring, Explainability, Monitoring, Governance) independently deployed on Vercel, talking to a FastAPI backend on Render over REST.

## Key Engineering Decisions and Tradeoffs

**Custom production pointer vs. MLflow native stage labels.** MLflow's built-in staging requires live MLflow access to resolve at serving time. A file-based pointer (`production_model_pointer.json`) decouples serving from MLflow availability, at the cost of having to keep the pointer consistent with MLflow state.

**Per-request SHAP vs. batch explanation.** Computing SHAP per request adds latency but is what makes counterfactual simulation and attribution-delta analysis possible at runtime. A batch approach would be cheaper to serve but would remove the interactive explainability surface entirely.

**Evidently + a custom monitoring layer, not one or the other.** Evidently produces structured, shareable audit artifacts; the custom layer converts the same signals into an operator-facing stability score and escalation decision. Neither alone covers both needs.

**Stateless serving layer.** The FastAPI backend loads the model and feature pipeline from disk on startup and holds no other state — simple to deploy and scale horizontally, at the cost of cold-start artifact loading (compounded by Render's free-tier cold start).

## Verified Outcomes

| Metric | Value |
|---|---|
| MAE | 1,190.07 |
| RMSE | 1,864.94 |
| R² | 0.5738 |
| Data validation | 188,318 rows / 132 columns, 0.0 null ratio, 0.0 duplicate ratio — all checks passed |
| DVC pipeline | 6 dependency-tracked, independently cacheable stages |

See [Benchmarks](BENCHMARKS.md) and [Model Card](MODEL_CARD.md) for full detail and sourcing.

## Honest Limitations

This system is a live, interactive portfolio demonstration — not a production insurance decision system. Per its own governance documentation ([Responsible AI](../artifacts/governance/RESPONSIBLE_AI.md), [MLOps Readiness](MLOPS_READINESS.md)):

- The monitoring baseline is synthetic, not historical, and does not yet update automatically as production distribution shifts.
- Fairness and subgroup analysis are not yet active runtime controls.
- Governance promotion/rollback controls are operator-facing review surfaces, not an enforced approval workflow.
- Security hardening (auth, rate limiting) required for real production use is not yet implemented.

These are documented, named constraints — not gaps discovered after the fact.

## What This Demonstrates

The system was built to show full-lifecycle ML engineering depth beyond model accuracy: reproducible pipelines (DVC), experiment lineage and lifecycle control (MLflow plus a custom registry layer), live per-request explainability (SHAP as a runtime service, not a notebook artifact), production-style observability (Evidently plus custom decision logic), and a governance surface that makes lifecycle state auditable without requiring access to the underlying tracking infrastructure.
