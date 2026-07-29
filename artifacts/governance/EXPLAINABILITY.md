# Explainability Overview

## Explainable Insurance Claim Severity ML System

---

## 1. Overview

This document describes how the system provides interpretable predictions using SHAP (SHapley Additive Explanations).

The explainability layer is designed to ensure that model outputs are:

- transparent
- traceable
- understandable at an individual prediction level

The system exposes explainability through a dedicated API endpoint, enabling users to understand the reasoning behind each prediction.

---

## 2. Explainability Objective

The system answers the key question:

"Why did the model produce this prediction?"

For every prediction, the system returns:

- predicted claim severity
- top contributing features influencing the prediction

This allows users to analyze model behavior at a granular level.

---

## 3. Explainability Architecture

The explainability component is integrated directly into the ML system pipeline.

Endpoint:
POST /explain

Response includes prediction and top feature contributions for the given input.

Processing Flow:

Step 1 — Input Handling

- accepts sparse input (partial features)
- fills missing features using default values
- aligns input with expected training schema

Step 2 — Schema Alignment

- ensures feature order matches training-time schema

Step 3 — Transformation

- applies the saved preprocessing pipeline

Step 4 — Prediction

- generates prediction using the trained XGBoost model

Step 5 — SHAP Computation

- computes SHAP values using TreeExplainer
- calculates contribution of each feature

Step 6 — Output Formatting

- selects top 10 most impactful features
- returns prediction + explanation

---

## 4. Output Structure

Example response:

{
  "prediction": 74200.5,
  "explanation": {
    "cat__cat71_A": 23.5,
    "cat__cat89_D": -18.2
  }
}

---

## 5. Interpretation Guide

Contribution Meaning:

- Positive value → increases prediction
- Negative value → decreases prediction
- Larger magnitude → stronger influence

Example:

Feature          Contribution     Meaning
cat__cat71_A     +23.5            pushes prediction higher
cat__cat89_D     -18.2            pulls prediction lower

---

## 6. Important Considerations

SHAP Explains Model Behavior, Not Reality

SHAP explains:

- how the model arrived at a prediction

It does NOT explain:

- real-world causality
- why an outcome occurred in reality

---

Feature Naming Limitation

The live explanation path derives feature names from the fitted preprocessing pipeline via `pipeline.get_feature_names_out()`, so returned keys are transformed one-hot names such as:

cat__cat71_A, cat__cat89_D, cont__cont1, ...

These are more informative than generic transformed-feature indices (they identify the source column and, for categorical features, the specific category), but they are still pipeline-level names, not necessarily original business-friendly feature labels.

---

## 7. System Strengths

- Local (per prediction) explainability
- Fully aligned with training pipeline
- Efficient SHAP computation for tree models
- Integrated directly into API
- Supports debugging and transparency

---

## 8. Current Limitations

- Feature names are transformed one-hot pipeline names (e.g. `cat__cat71_A`), not necessarily original business-friendly feature labels
- Explanations are in transformed feature space
- No global explanation dashboard
- No explanation aggregation across predictions

---

## 9. Future Improvements

High Priority:

- Map SHAP outputs to original feature names
- Improve interpretability of outputs

Medium Priority:

- Add global feature importance summaries
- Build visualization dashboards

Advanced:

- Track explanation drift over time
- Add explanation analytics layer
- Integrate business-level explanation mapping

---

## 10. Summary

The explainability layer ensures that predictions are:

- transparent
- interpretable
- reviewable

This reduces the black-box nature of machine learning models and allows users to understand how predictions are generated.

---

System: Explainable Insurance Claim Severity ML System
Document: Explainability Overview
Version: v1.0.0
