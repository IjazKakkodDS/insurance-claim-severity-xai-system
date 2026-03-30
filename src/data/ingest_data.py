import os
import pandas as pd


RAW_DATA_PATH = "data/raw"
PROCESSED_DATA_PATH = "data/processed"


def ingest_data():
    
    print("Starting data ingestion...")

    train_path = os.path.join(RAW_DATA_PATH, "train.csv")
    test_path = os.path.join(RAW_DATA_PATH, "test.csv")

    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)

    print("Train shape:", train_df.shape)
    print("Test shape:", test_df.shape)

    os.makedirs(PROCESSED_DATA_PATH, exist_ok=True)

    train_df.to_csv(os.path.join(PROCESSED_DATA_PATH, "train_processed.csv"), index=False)
    test_df.to_csv(os.path.join(PROCESSED_DATA_PATH, "test_processed.csv"), index=False)

    print("Data ingestion completed.")


if __name__ == "__main__":
    ingest_data()
