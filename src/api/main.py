import os
import time
import uuid
import traceback

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.api.inference import InferenceService
from src.api.schemas import (
    ExplainResponse,
    HealthResponse,
    PredictionRequest,
    PredictionResponse,
)
from src.explainability.shap_service import ShapService
from src.monitoring.drift_detection import DriftDetectionService
from src.monitoring.evidently_service import EvidentlyService
from src.monitoring.explain_logger import ExplainLogger
from src.monitoring.monitoring_service import MonitoringService
from src.monitoring.prediction_distribution import PredictionDistributionService
from src.monitoring.prediction_logger import PredictionLogger

app = FastAPI(
    title="Explainable Insurance Claim Severity API",
    version="1.0.0"
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL] if FRONTEND_URL != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inference_service = InferenceService()
shap_service = ShapService()
prediction_logger = PredictionLogger()
explain_logger = ExplainLogger()
monitoring_service = MonitoringService()
drift_detection_service = DriftDetectionService()
prediction_distribution_service = PredictionDistributionService()
evidently_service = EvidentlyService()


@app.get("/")
def root():
    return {"message": "Insurance Claim Severity API is running."}


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok")


@app.get("/model-info")
def model_info():
    try:
        return inference_service.get_model_registry_info()

    except Exception as e:
        print("UNEXPECTED ERROR IN /model-info")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


@app.get("/monitoring/summary")
def monitoring_summary():
    try:
        return monitoring_service.get_summary()

    except Exception as e:
        print("UNEXPECTED ERROR IN /monitoring/summary")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


@app.get("/monitoring/drift")
def monitoring_drift():
    try:
        return drift_detection_service.detect_drift()

    except ValueError as e:
        print("VALUE ERROR IN /monitoring/drift")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print("UNEXPECTED ERROR IN /monitoring/drift")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


@app.get("/monitoring/distribution")
def monitoring_distribution():
    try:
        return prediction_distribution_service.get_distribution_summary()

    except ValueError as e:
        print("VALUE ERROR IN /monitoring/distribution")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print("UNEXPECTED ERROR IN /monitoring/distribution")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


@app.get("/monitoring/evidently")
def monitoring_evidently():
    try:
        return evidently_service.generate_report()

    except ValueError as e:
        print("VALUE ERROR IN /monitoring/evidently")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        print("UNEXPECTED ERROR IN /monitoring/evidently")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    try:
        result = inference_service.predict(request.features)
        prediction_value = float(result["prediction"])

        latency_ms = (time.perf_counter() - start_time) * 1000

        prediction_logger.log_prediction(
            request_id=request_id,
            input_features=request.features,
            prediction=prediction_value,
            latency_ms=latency_ms,
        )

        return PredictionResponse(
            request_id=request_id,
            prediction=prediction_value,
        )

    except ValueError as e:
        print("VALUE ERROR IN /predict")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        print("UNEXPECTED ERROR IN /predict")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


@app.post("/explain", response_model=ExplainResponse)
def explain(request: PredictionRequest):
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    try:
        prediction, explanation = shap_service.explain(request.features)

        prediction = float(prediction)
        latency_ms = (time.perf_counter() - start_time) * 1000

        explain_logger.log_explanation(
            request_id=request_id,
            input_features=request.features,
            prediction=prediction,
            explanation=explanation,
            latency_ms=latency_ms,
        )

        return ExplainResponse(
            request_id=request_id,
            prediction=prediction,
            explanation=explanation,
        )

    except ValueError as e:
        print("VALUE ERROR IN /explain")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        print("UNEXPECTED ERROR IN /explain")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")