# Screenshots

Captured live from the deployed platform (Vercel frontend + Render backend) on 2026-07-27.

| File | Surface | Notes |
|---|---|---|
| `01_overview.png` | Overview | Guided walkthrough entry point |
| `02_scoring.png` | Scoring | Live prediction generated against the production endpoint (severity 74,027.84, High risk band) |
| `03_explainability.png` | Explainability | Live SHAP explanation for the same input, dominant driver surfaced |
| `04_monitoring.png` | Monitoring | Live stability score and drift/skew/concentration/volatility penalties |
| `05_governance.png` | Governance | Live model registry, lifecycle stage, and responsible AI signals |

These reflect the free-tier Render backend's cold-start behavior and current in-memory/log state at capture time; values shown (e.g. prediction, stability score) will vary on subsequent live visits.
