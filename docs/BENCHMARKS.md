# Benchmarks

Explainable Insurance Claim Severity System · Source: [reports/model_metrics.json](../reports/model_metrics.json), [reports/evaluation_report.json](../reports/evaluation_report.json), [logs/predictions.json](../logs/predictions.json), [logs/explanations.json](../logs/explanations.json), [dvc.yaml](../dvc.yaml)

---

## Model Selection Metrics

Five candidate models were trained under identical cross-validation conditions on the Allstate Claim Severity dataset (188,318 rows, 132 features).

| Model | Selected |
|---|---|
| Linear Regression | No |
| Ridge Regression | No |
| Random Forest | No |
| Gradient Boosting | No |
| XGBoost | **Yes** |

XGBoost hyperparameters (`params.yaml`): `n_estimators=200`, `learning_rate=0.05`, `max_depth=6`, `subsample=0.8`, `colsample_bytree=0.8`, `objective=reg:squarederror`.

## Held-Out Evaluation Metrics

| Metric | Value |
|---|---|
| MAE | 1,190.07 |
| RMSE | 1,864.94 |
| R² | 0.5738 (0.57375) |

Model-selection metrics and held-out evaluation metrics are identical, per `reports/model_metrics.json` and `reports/evaluation_report.json`.

Supporting diagnostics: `reports/residual_plot.png`, `reports/error_distribution.png`, `reports/shap_summary_plot.png`, `reports/shap_feature_importance.png`.

## Data Validation Benchmarks

Per `artifacts/governance/governance_report.json`:

| Check | Result |
|---|---|
| Rows / columns | 188,318 / 132 — within expected range |
| Null ratio | 0.0 across all columns |
| Duplicate ratio | 0.0 |
| Type check | Passed |
| Target check | Passed |

## Observed Runtime Latency (sample, not a formal load test)

The repository's committed request logs (`logs/predictions.json`, `logs/explanations.json`) contain per-request latency measurements captured during local development and manual testing. These are illustrative, not the result of a controlled load test or production SLA:

| Endpoint | Sample size | Min (ms) | Max (ms) | Average (ms) |
|---|---|---|---|---|
| `/predict` | 18 requests | 20.4 | 308.2 | 53.3 |
| `/explain` | 33 requests | 28.6 | 137.6 | 57.7 |

**Caveat:** these figures reflect local/manual requests logged during development, not a benchmark run against the live Render deployment under load. The live deployment additionally carries a documented 30–60 second cold-start on the first request after inactivity (Render free tier).

## Pipeline Reproducibility

DVC pipeline: 6 dependency-tracked stages (`data_ingestion → data_validation → feature_engineering → model_training → model_evaluation → model_explainability`), each independently cacheable — changing one stage reruns only its downstream dependents, not the full pipeline.
