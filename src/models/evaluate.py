import os
import json
import joblib
import pandas as pd
import matplotlib.pyplot as plt
import mlflow

from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


X_VALID_PATH = "data/features/X_valid.csv"
Y_VALID_PATH = "data/features/y_valid.csv"
MODEL_PATH = "models/best_model.pkl"
REPORT_DIR = "reports"


print("Loading validation dataset...")
X_valid = pd.read_csv(X_VALID_PATH)
y_valid = pd.read_csv(Y_VALID_PATH).values.ravel()

X_valid = X_valid.sort_index(axis=1)

print("Validation shape:", X_valid.shape)

with open("artifacts/run_id.txt", "r") as f:
    parent_run_id = f.read().strip()

with mlflow.start_run(run_id=parent_run_id):
    print("Loading trained model...")
    model = joblib.load(MODEL_PATH)

    print("Generating predictions...")
    preds = model.predict(X_valid)

    mae = mean_absolute_error(y_valid, preds)
    rmse = mean_squared_error(y_valid, preds) ** 0.5
    r2 = r2_score(y_valid, preds)

    metrics = {
        "MAE": float(mae),
        "RMSE": float(rmse),
        "R2": float(r2)
    }

    print("Evaluation Metrics:")
    print(metrics)

    mlflow.log_metrics(metrics)

    os.makedirs(REPORT_DIR, exist_ok=True)

    report_path = f"{REPORT_DIR}/evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=4)
    mlflow.log_artifact(report_path)

    residuals = y_valid - preds

    residual_path = f"{REPORT_DIR}/residual_plot.png"
    plt.figure(figsize=(8, 6))
    plt.scatter(preds, residuals, alpha=0.3)
    plt.axhline(0, color="red")
    plt.xlabel("Predicted Values")
    plt.ylabel("Residuals")
    plt.title("Residual Plot")
    plt.savefig(residual_path)
    plt.close()
    mlflow.log_artifact(residual_path)

    error_path = f"{REPORT_DIR}/error_distribution.png"
    plt.figure(figsize=(8, 6))
    plt.hist(residuals, bins=50)
    plt.title("Residual Error Distribution")
    plt.savefig(error_path)
    plt.close()
    mlflow.log_artifact(error_path)

print("Evaluation completed.")