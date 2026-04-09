
# System Snapshot

### Explainable Insurance Claim Severity Platform

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Serving-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?logo=nextdotjs&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-Model-EC6B23)
![MLflow](https://img.shields.io/badge/MLflow-Lifecycle%20Control-0194E2?logo=mlflow&logoColor=white)
![SHAP](https://img.shields.io/badge/SHAP-Explainability-FF6F00)
![Evidently](https://img.shields.io/badge/Evidently-Monitoring-6C5CE7)
![Docker](https://img.shields.io/badge/Docker-Deployment-2496ED?logo=docker&logoColor=white)

**Live platform:** [insurance-claim-severity-xai-system.vercel.app](https://insurance-claim-severity-xai-system.vercel.app/)  |  **Full documentation:** [README.md](./README.md)

> Backend hosted on Render free tier. Allow 30 to 60 seconds on first request for cold start.

---

## One Sentence

A production-grade decision intelligence platform that predicts insurance claim severity, explains every prediction at runtime, monitors model behavior in production, and surfaces full lifecycle governance through a governed, operator-facing product interface.

---

## The Gap This Closes

Predictive accuracy alone does not make a model production-ready. In an insurance claim workflow, a severity estimate without context cannot be reviewed, audited, monitored, or governed.

```
What most models deliver          What this platform delivers
─────────────────────────         ──────────────────────────────────────────────────
A severity number                 Severity + risk band + recommendation + driver ranking
Nothing                           Live SHAP attribution per prediction at request time
Offline reports                   Runtime counterfactual simulation across input scenarios
Spreadsheet logs                  Stability score + escalation decision + Evidently reports
MLflow UI only                    File-based production pointer readable without MLflow
```

---

## System Architecture

```
Allstate Claim Data (188,318 rows, 132 features)
  │
  └── DVC Pipeline  ·  6 reproducible stages: ingest / validate / engineer / train / evaluate / register
        │
        └── MLflow  ·  Full experiment lineage, metric history, model registration
              │
              └── Production Pointer  ·  File-based serving truth, no MLflow runtime dependency
                    │
                    ├── FastAPI Backend
                    │     /predict      ·  XGBoost severity estimate, risk band, recommendation
                    │     /explain      ·  Live SHAP attribution, counterfactual comparison
                    │     /monitoring   ·  Distribution tracking, drift detection, stability score
                    │     /governance   ·  Version history, lifecycle metadata, rollback traceability
                    │
                    └── Next.js Frontend  ·  Five integrated product surfaces
                          Overview        ·  Guided scenario launch with walkthrough flow
                          Scoring         ·  Live prediction + driver-shift simulation
                          Explainability  ·  SHAP attribution + before-vs-after comparison
                          Monitoring      ·  Drift signals + escalation decisions + Evidently
                          Governance      ·  Lifecycle audit + responsible AI surface
```

**Hot path** (predict, explain) is synchronous and latency-logged per request.
**Cold path** (monitoring, governance) is on-demand and artifact-driven. The two paths share no runtime dependencies.

---

## Four Capabilities. One Coherent System.

**Severity Prediction.**
XGBoost model selected from five candidates on MAE, RMSE, and R². Each prediction returns a severity estimate, risk band classification (Low / Medium / High), and an operational handling recommendation. MAE: 1,190.07. R²: 0.5738.

**Explainability.**
SHAP attribution runs as a live API service, not a post-training artifact. Every prediction carries an auditable driver breakdown. Counterfactual simulation compares baseline and modified attributions, with feature-level delta analysis and direction-flip detection per driver.

**Monitoring.**
Raw distribution signals are converted into a unified stability score built from drift, skew, concentration, volatility, and trend. The monitoring surface outputs an escalation decision (Hold / Watch / Escalate) and a recommended action, not just statistics. Evidently generates structured audit reports alongside the custom decision layer.

**Governance.**
MLflow experiment lineage is extended with a custom production pointer, version history log, and rollback traceability layer. The governance surface exposes lifecycle state, registry metadata, and responsible AI artifacts without requiring MLflow UI access at runtime.

---

## Demo Sequence

Open the platform and follow this path to see the full system in operation.

| Step | Surface        | What to observe                                                    |
| :--: | -------------- | ------------------------------------------------------------------ |
|  1  | Overview       | Launch a validated baseline scenario using the guided walkthrough  |
|  2  | Scoring        | Generate a prediction and read the risk band and recommendation    |
|  3  | Scoring        | Trigger a dominant-driver shift on `cat71` and run the simulation |
|  4  | Explainability | Compare SHAP attribution before and after the driver shift         |
|  5  | Monitoring     | Read the stability score, drift signals, and escalation guidance   |
|  6  | Governance     | Inspect model lineage, version history, and responsible AI framing |

---

## Stack

| Layer                            | Technology                            |
| -------------------------------- | ------------------------------------- |
| Pipeline orchestration           | DVC                                   |
| Experiment tracking and registry | MLflow                                |
| Modeling                         | Python, scikit-learn, XGBoost         |
| Explainability                   | SHAP                                  |
| Monitoring                       | Evidently, custom monitoring services |
| Backend                          | FastAPI, Docker                       |
| Frontend                         | Next.js, TypeScript, Recharts         |
| Deployment                       | Render (backend), Vercel (frontend)   |

---

**Ijaz Kakkod**  |  Machine Learning Systems · Explainable AI · Model Governance

[![GitHub](https://img.shields.io/badge/GitHub-IjazKakkodDS-181717?logo=github&logoColor=white)](https://github.com/IjazKakkodDS)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-ijazkakkod-0A66C2?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ijazkakkod/)
