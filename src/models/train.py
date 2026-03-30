import os
import json
import joblib
import yaml
import pandas as pd
import mlflow
import mlflow.sklearn

from xgboost import XGBRegressor
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


X_TRAIN_PATH = "data/features/X_train.csv"
X_VALID_PATH = "data/features/X_valid.csv"
Y_TRAIN_PATH = "data/features/y_train.csv"
Y_VALID_PATH = "data/features/y_valid.csv"

REPORT_OUTPUT_PATH = "reports/model_metrics.json"
BEST_MODEL_PATH = "models/best_model.pkl"


print("Loading parameters from params.yaml...")
with open("params.yaml", "r") as f:
    params = yaml.safe_load(f)

xgb_params = params["xgboost"]
training_params = params["training"]


print("Loading feature datasets...")
X_train = pd.read_csv(X_TRAIN_PATH)
X_valid = pd.read_csv(X_VALID_PATH)

y_train = pd.read_csv(Y_TRAIN_PATH).values.ravel()
y_valid = pd.read_csv(Y_VALID_PATH).values.ravel()

X_train = X_train.sort_index(axis=1)
X_valid = X_valid.sort_index(axis=1)


models = {
    "LinearRegression": LinearRegression(),
    "RandomForest": RandomForestRegressor(
        n_estimators=100,
        random_state=training_params["random_state"],
        n_jobs=-1
    ),
    "XGBoost": XGBRegressor(
        n_estimators=xgb_params["n_estimators"],
        learning_rate=xgb_params["learning_rate"],
        max_depth=xgb_params["max_depth"],
        subsample=xgb_params["subsample"],
        colsample_bytree=xgb_params["colsample_bytree"],
        objective=xgb_params["objective"],
        random_state=training_params["random_state"],
        n_jobs=-1
    )
}


mlflow.set_experiment("insurance-claim-severity")

best_model = None
best_model_name = None
best_rmse = float("inf")
best_metrics = None


for model_name, model in models.items():
    with mlflow.start_run(run_name=model_name):
        print(f"Training {model_name}...")

        mlflow.log_param("model_name", model_name)
        mlflow.log_param("random_state", training_params["random_state"])

        if model_name == "XGBoost":
            mlflow.log_params(xgb_params)

        model.fit(X_train, y_train)
        preds = model.predict(X_valid)

        mae = mean_absolute_error(y_valid, preds)
        rmse = mean_squared_error(y_valid, preds) ** 0.5
        r2 = r2_score(y_valid, preds)

        metrics = {
            "MAE": float(mae),
            "RMSE": float(rmse),
            "R2": float(r2)
        }

        print(f"{model_name} Metrics:", metrics)

        mlflow.log_metric("MAE", mae)
        mlflow.log_metric("RMSE", rmse)
        mlflow.log_metric("R2", r2)

        os.makedirs("models", exist_ok=True)
        model_path = f"models/{model_name}.pkl"
        joblib.dump(model, model_path)

        mlflow.sklearn.log_model(model, name="model")

        if rmse < best_rmse:
            best_rmse = rmse
            best_model = model
            best_model_name = model_name
            best_metrics = metrics


print(f"Best model: {best_model_name} with RMSE: {best_rmse}")

joblib.dump(best_model, BEST_MODEL_PATH)

os.makedirs("reports", exist_ok=True)
with open(REPORT_OUTPUT_PATH, "w") as f:
    json.dump(
        {
            "best_model": best_model_name,
            "metrics": best_metrics
        },
        f,
        indent=4
    )


with mlflow.start_run(run_name="Best_Model") as parent_run:
    run_id = parent_run.info.run_id

    os.makedirs("artifacts", exist_ok=True)
    with open("artifacts/run_id.txt", "w") as f:
        f.write(run_id)

    mlflow.log_param("best_model", best_model_name)
    mlflow.log_metrics(best_metrics)
    mlflow.sklearn.log_model(best_model, name="best_model")
    mlflow.log_artifact(REPORT_OUTPUT_PATH)

print("Training and best model selection completed successfully.")