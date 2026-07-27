# Model Card — Explainable Insurance Claim Severity System

Version: v1.0.0 · Source: [artifacts/governance/model_card.json](../artifacts/governance/model_card.json), [reports/model_metrics.json](../reports/model_metrics.json), [reports/evaluation_report.json](../reports/evaluation_report.json)

---

## Model Overview

| Attribute | Value |
|---|---|
| Model name | XGBoost |
| Project | Explainable Insurance Claim Severity ML System |
| Model type | Supervised regression model |
| Objective | Predict insurance claim severity from engineered numerical and categorical features |
| Deployment artifact | `models/best_model.pkl` |
| Preprocessing artifact | `models/feature_pipeline.pkl` |

## Training Data

| Attribute | Value |
|---|---|
| Dataset | Allstate Claim Severity |
| Training rows | 188,318 |
| Feature columns | 132 |
| Input sources | `data/raw/train.csv`, `data/raw/test.csv` (DVC-tracked, not committed) |
| Processed feature sources | `data/features/X_train.csv`, `X_valid.csv`, `y_train.csv`, `y_valid.csv` |

## Model Selection

Five candidate models were trained under identical cross-validation conditions and compared on MAE, RMSE, and R²:

| Model | Selected |
|---|---|
| Linear Regression | No |
| Ridge Regression | No |
| Random Forest | No |
| Gradient Boosting | No |
| XGBoost | **Yes** |

XGBoost was selected on lowest MAE, highest R², and stable cross-validation performance with no overfitting signal.

## Performance

| Metric | Value |
|---|---|
| MAE | 1,190.07 |
| RMSE | 1,864.94 |
| R² | 0.5738 (0.57375) |

These figures are identical for model-selection metrics and held-out evaluation metrics, per `reports/model_metrics.json` and `reports/evaluation_report.json`.

**Interpretation:** moderate predictive performance. Suitable for estimation, triage, and decision-support use; not sufficient on its own for high-stakes autonomous decisions.

## Explainability

| Attribute | Value |
|---|---|
| Method | SHAP TreeExplainer |
| Service artifact | `src/explainability/shap_service.py` |
| Prediction endpoint | `POST /predict` |
| Explanation endpoint | `POST /explain` |

Explanation behavior:
1. Raw sparse input is aligned to expected raw training features.
2. Missing features are imputed with serving defaults.
3. Input is transformed through the saved feature pipeline.
4. Prediction is generated using the selected best model.
5. Top 10 SHAP feature contributions are returned.

**Note:** SHAP explains model behavior, not real-world causality. Feature contribution labels are currently generic transformed feature indices (e.g. `feature_12`), not business-native names — see [MLOps Readiness](MLOPS_READINESS.md) for planned remediation.

## Intended Use

**Primary users:** ML engineers, data scientists, analytics stakeholders, portfolio reviewers, technical interviewers.

**Use cases:** insurance claim severity estimation, model explainability demonstration, monitoring and drift reporting demonstration, end-to-end ML system portfolio showcase.

**Out of scope:**
- Fully automated decision-making without human review
- Production insurance underwriting without additional validation
- Medical, legal, or life-critical decision support

## Monitoring

| Attribute | Value |
|---|---|
| Prediction log | `logs/predictions.json` |
| Explanation log | `logs/explanations.json` |
| Monitoring endpoints | `/monitoring/summary`, `/monitoring/drift`, `/monitoring/distribution`, `/monitoring/evidently` |
| Evidently report directory | `reports/evidently` |

## Ethical Considerations

- Predictions may reflect dataset-specific biases.
- Model performance may degrade under distribution shift.
- Explanations indicate feature contribution, not causality.
- Synthetic monitoring baselines may produce unstable statistical warnings.
- Human oversight is required; fairness review has not yet been completed.

## Known Limitations

- Baseline drift reference is currently synthetic rather than historical.
- Feature contribution labels are generic transformed feature indices.
- Fairness assessment is not yet implemented.
- Robust adversarial input testing is not yet implemented.

## Deployment Status

This system demonstrates production-style architecture, but formal governance documentation ([Responsible AI](../artifacts/governance/RESPONSIBLE_AI.md)) classifies it as **pre-production** and not approved for real insurance claim decisions. It is deployed as a live, publicly reachable portfolio demo (Vercel + Render), which is a separate claim from formal production approval — see [MLOps Readiness](MLOPS_READINESS.md).
