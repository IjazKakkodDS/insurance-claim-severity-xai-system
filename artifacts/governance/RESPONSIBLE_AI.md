# Responsible AI & Governance

## Explainable Insurance Claim Severity ML System

---

## 1. Overview

This document outlines the Responsible AI principles, governance considerations, monitoring practices, and usage boundaries for the **Explainable Insurance Claim Severity ML System**.

The system is designed as a **production-style ML pipeline** incorporating:

- Data validation
- Model training and evaluation
- Explainability (SHAP)
- Monitoring and drift detection
- Logging and observability

The objective is to ensure that model outputs are **transparent, reviewable, and used within clearly defined operational limits**.

---

## 2. Intended Use

### Primary Use Cases

- Insurance claim severity estimation
- Model explainability and interpretation
- Drift detection and monitoring
- Analytical decision support

### Intended Users

| Role                   | Description                          |
| ---------------------- | ------------------------------------ |
| Data Scientists        | Model evaluation and experimentation |
| ML Engineers           | System integration and deployment    |
| Risk / Analytics Teams | Decision support and analysis        |
| Stakeholders           | Reviewing model-driven insights      |

---

## 3. Out-of-Scope Use

This system must **NOT** be used for:

- Fully automated decision-making without human oversight
- Legal, medical, or life-critical decisions
- High-stakes financial approvals without governance controls
- Any binding decision where model output is treated as final

> Model outputs must be treated as **decision-support estimates**, not autonomous decisions.

---

## 4. Model Summary

| Attribute  | Value                            |
| ---------- | -------------------------------- |
| Model Type | XGBoost Regressor                |
| Task       | Regression                       |
| Objective  | Predict insurance claim severity |

### Performance Snapshot

| Metric | Value |
| ------ | ----- |
| MAE    | ~1190 |
| RMSE   | ~1865 |
| R²    | ~0.57 |

### Interpretation

- Moderate predictive performance
- Suitable for estimation and analysis
- Not sufficient for high-stakes autonomous decisions

---

## 5. Data Governance

### Validation Coverage

| Check Type      | Description                       | Status    |
| --------------- | --------------------------------- | --------- |
| Column Check    | Ensures schema consistency        | ✅ Passed |
| Null Check      | Detects missing values            | ✅ Passed |
| Duplicate Check | Identifies duplicate records      | ✅ Passed |
| Type Check      | Validates data types              | ✅ Passed |
| Target Check    | Ensures valid target distribution | ✅ Passed |

### Data Limitations

- Dataset reflects a **specific historical distribution**
- No fairness or subgroup labels available
- Temporal drift is not explicitly modeled

---

## 6. Explainability

### Method

- SHAP (TreeExplainer)

### Explainability Flow

| Step             | Description                           |
| ---------------- | ------------------------------------- |
| Input Handling   | Sparse input aligned to schema        |
| Preprocessing    | Feature pipeline transformation       |
| Prediction       | Model generates output                |
| SHAP Computation | Feature contributions calculated      |
| Output           | Top 10 feature contributions returned |

### Important Note

> SHAP explains **model behavior**, not real-world causality.

---

## 7. Monitoring & Observability

### Logging

| Component        | Description                |
| ---------------- | -------------------------- |
| Prediction Logs  | Stores input + predictions |
| Explanation Logs | Stores SHAP outputs        |
| Request ID       | Tracks each request        |
| Latency Tracking | Measures response time     |

### Monitoring Capabilities

| Feature                 | Description             |
| ----------------------- | ----------------------- |
| Summary Metrics         | Aggregated system stats |
| Drift Detection         | Baseline comparison     |
| Distribution Monitoring | Prediction analysis     |
| Evidently Reports       | HTML drift reports      |

### Current Limitation

- Monitoring baseline is **synthetic**, not historical
- Can cause statistical instability in drift detection

---

## 8. Key Limitations

| Limitation             | Description                             |
| ---------------------- | --------------------------------------- |
| Synthetic Baseline     | Uses feature means instead of real data |
| No Fairness Analysis   | No subgroup bias testing                |
| SHAP Naming Gap        | Features not mapped to business terms   |
| No Adversarial Testing | No robustness evaluation                |
| Moderate Accuracy      | Not suitable for critical decisions     |

---

## 9. Responsible Use Guidelines

### Required Controls

- Human oversight must always be present
- Predictions must be interpreted in context
- Monitoring outputs should be reviewed regularly
- Limitations must be communicated clearly

### Recommended Practices

- Replace synthetic baseline with historical data
- Implement fairness and bias analysis
- Improve feature interpretability
- Add robustness and stress testing

---

## 10. Security & Privacy Considerations

The current system does **not yet include full production security controls**.

### Required for Production

| Area           | Requirement               |
| -------------- | ------------------------- |
| Authentication | User access control       |
| Rate Limiting  | Prevent abuse             |
| Logging        | Secure and sanitized logs |
| Model Storage  | Secure artifact storage   |
| Transport      | HTTPS / encryption        |
| Privacy        | Data governance review    |

---

## 11. Deployment Status

### Current Status

> **Pre-Production (Not Approved for Live Deployment)**

### Strengths

- End-to-end ML pipeline
- Explainability integration
- Monitoring and drift detection
- Logging and observability
- Governance documentation

### Required Before Production

- Fairness assessment
- Real monitoring baseline
- Adversarial testing
- Security hardening
- Explainability improvements
- Formal governance approval

---

## 12. Final Note

This system demonstrates a **production-style ML architecture** that emphasizes:

- Transparency
- Traceability
- Monitoring
- Responsible usage
- Explicit limitations

Reliable ML systems require more than predictive accuracy — they require **governance, visibility, and disciplined usage boundaries**.

---

**System:** Explainable Insurance Claim Severity ML System
**Document:** Responsible AI & Governance
**Version:** v1.0.0
