import os
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

from src.data.schema import get_schema
from src.features.feature_manifest import build_feature_manifest, save_feature_manifest


# -----------------------------
# Paths
# -----------------------------

TRAIN_PATH = "data/processed/train_processed.csv"

FEATURE_OUTPUT_PATH = "data/features"

PIPELINE_OUTPUT_PATH = "models/feature_pipeline.pkl"


# -----------------------------
# Load Data
# -----------------------------

print("Loading processed dataset...")

df = pd.read_csv(TRAIN_PATH)

print("Dataset shape:", df.shape)


# -----------------------------
# Load Schema + Feature Manifest
# -----------------------------

print("Building feature manifest...")

schema = get_schema()

manifest = build_feature_manifest(df, schema)
save_feature_manifest(manifest)

print("Feature manifest created successfully.")


# -----------------------------
# Separate Target
# -----------------------------

TARGET = schema["target_column"]

y = df[TARGET]
X = df.drop(columns=[TARGET])


# -----------------------------
# Identify Column Types
# -----------------------------

categorical_cols = X.select_dtypes(include=["object"]).columns.tolist()
numerical_cols = X.select_dtypes(exclude=["object"]).columns.tolist()

print("Categorical columns:", len(categorical_cols))
print("Numerical columns:", len(numerical_cols))


# -----------------------------
# Train / Validation Split
# -----------------------------

X_train, X_valid, y_train, y_valid = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("Train shape:", X_train.shape)
print("Validation shape:", X_valid.shape)


# -----------------------------
# Preprocessing Pipelines
# -----------------------------

categorical_pipeline = Pipeline(
    steps=[
        ("encoder", OneHotEncoder(handle_unknown="ignore"))
    ]
)

numerical_pipeline = Pipeline(
    steps=[
        ("scaler", StandardScaler())
    ]
)


preprocessor = ColumnTransformer(
    transformers=[
        ("cat", categorical_pipeline, categorical_cols),
        ("num", numerical_pipeline, numerical_cols)
    ]
)


# -----------------------------
# Fit Pipeline
# -----------------------------

print("Fitting preprocessing pipeline...")

preprocessor.fit(X_train)


# -----------------------------
# Transform Data
# -----------------------------

X_train_transformed = preprocessor.transform(X_train)
X_valid_transformed = preprocessor.transform(X_valid)


# -----------------------------
# Convert to DataFrame
# -----------------------------

X_train_df = pd.DataFrame(X_train_transformed.toarray())
X_valid_df = pd.DataFrame(X_valid_transformed.toarray())


# -----------------------------
# Save Outputs
# -----------------------------

os.makedirs(FEATURE_OUTPUT_PATH, exist_ok=True)

X_train_df.to_csv(f"{FEATURE_OUTPUT_PATH}/X_train.csv", index=False)
X_valid_df.to_csv(f"{FEATURE_OUTPUT_PATH}/X_valid.csv", index=False)

y_train.to_csv(f"{FEATURE_OUTPUT_PATH}/y_train.csv", index=False)
y_valid.to_csv(f"{FEATURE_OUTPUT_PATH}/y_valid.csv", index=False)

print("Feature datasets saved.")


# -----------------------------
# Save Pipeline
# -----------------------------

os.makedirs("models", exist_ok=True)

joblib.dump(preprocessor, PIPELINE_OUTPUT_PATH)

print("Feature pipeline saved.")


print("Feature engineering stage completed successfully.")