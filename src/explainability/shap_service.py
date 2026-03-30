import joblib
import pandas as pd
import shap
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models"


class ShapService:
    def __init__(self):
        model_path = MODELS_DIR / "best_model.pkl"
        pipeline_path = MODELS_DIR / "feature_pipeline.pkl"

        self.model = joblib.load(model_path)
        self.pipeline = joblib.load(pipeline_path)

        self.expected_raw_features = list(self.pipeline.feature_names_in_)

        try:
            self.transformed_feature_names = list(
                self.pipeline.get_feature_names_out()
            )
        except Exception:
            self.transformed_feature_names = None

        self.explainer = shap.TreeExplainer(self.model)

    def explain(self, input_data: dict):
        df = pd.DataFrame([input_data])

        missing_cols = [
            col for col in self.expected_raw_features if col not in df.columns
        ]

        for col in missing_cols:
            if col.startswith("cat"):
                df[col] = "missing"
            elif col.startswith("cont"):
                df[col] = 0
            else:
                df[col] = 0

        df = df[self.expected_raw_features]

        X_transformed = self.pipeline.transform(df)
        prediction = float(self.model.predict(X_transformed)[0])

        shap_values = self.explainer.shap_values(X_transformed)

        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        shap_values = shap_values[0]

        if (
            self.transformed_feature_names is not None
            and len(self.transformed_feature_names) == len(shap_values)
        ):
            feature_names = self.transformed_feature_names
        else:
            feature_names = [
                f"feature_{i}" for i in range(len(shap_values))
            ]

        contributions = {
            str(feature_names[i]): float(value)
            for i, value in enumerate(shap_values)
        }

        top_features = dict(
            sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)[:10]
        )

        return prediction, top_features