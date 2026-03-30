import os
import joblib
import shap
import pandas as pd
import matplotlib.pyplot as plt
import mlflow


MODEL_PATH = "models/best_model.pkl"
X_VALID_PATH = "data/features/X_valid.csv"
REPORT_DIR = "reports"


with open("artifacts/run_id.txt", "r") as f:
    parent_run_id = f.read().strip()

with mlflow.start_run(run_id=parent_run_id):
    print("Loading trained model...")
    model = joblib.load(MODEL_PATH)

    print("Loading validation features...")
    X_valid = pd.read_csv(X_VALID_PATH)
    X_valid = X_valid.sort_index(axis=1)

    print("Validation shape:", X_valid.shape)

    sample_data = X_valid.sample(1000, random_state=42)

    print("Creating SHAP TreeExplainer...")
    explainer = shap.TreeExplainer(model)

    print("Computing SHAP values...")
    shap_values = explainer(sample_data)

    os.makedirs(REPORT_DIR, exist_ok=True)

    summary_path = f"{REPORT_DIR}/shap_summary_plot.png"
    print("Saving SHAP summary plot...")
    shap.summary_plot(shap_values, sample_data, show=False)
    plt.savefig(summary_path, bbox_inches="tight")
    plt.close()
    mlflow.log_artifact(summary_path)

    importance_path = f"{REPORT_DIR}/shap_feature_importance.png"
    print("Saving SHAP feature importance plot...")
    shap.plots.bar(shap_values, show=False)
    plt.savefig(importance_path, bbox_inches="tight")
    plt.close()
    mlflow.log_artifact(importance_path)

print("Explainability completed.")