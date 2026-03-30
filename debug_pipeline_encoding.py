import joblib
import pandas as pd

pipeline = joblib.load("models/feature_pipeline.pkl")

# Test inputs
df_A = pd.DataFrame([{"id": 0, "cat1": "A", "cont1": 50000}])
df_B = pd.DataFrame([{"id": 0, "cat1": "B", "cont1": 50000}])

# Fill missing cols manually (minimal for test)
for df in [df_A, df_B]:
    for col in pipeline.feature_names_in_:
        if col not in df.columns:
            if col.startswith("cat"):
                df[col] = "missing"
            elif col.startswith("cont"):
                df[col] = 0
            else:
                df[col] = 0

    df[:] = df[pipeline.feature_names_in_]

# Transform
X_A = pipeline.transform(df_A)
X_B = pipeline.transform(df_B)

# Convert to DataFrame for readability
feature_names = pipeline.get_feature_names_out()

df_X_A = pd.DataFrame(X_A, columns=feature_names)
df_X_B = pd.DataFrame(X_B, columns=feature_names)

print("\n===== ENCODING A =====")
print(df_X_A.filter(like="cat__cat1"))

print("\n===== ENCODING B =====")
print(df_X_B.filter(like="cat__cat1"))