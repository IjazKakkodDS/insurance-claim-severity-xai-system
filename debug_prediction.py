import joblib
import pandas as pd

# Load FULL pipeline (model + preprocessing together)
model = joblib.load("models/best_model.pkl")

# Create test inputs
input_A = pd.DataFrame([{
    "cont1": 50000,
    "cat1": "A"
}])

input_B = pd.DataFrame([{
    "cont1": 50000,
    "cat1": "B"
}])

# Direct predict (pipeline inside model handles everything)
pred_A = model.predict(input_A)
pred_B = model.predict(input_B)

print("Prediction A:", pred_A)
print("Prediction B:", pred_B)