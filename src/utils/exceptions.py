class ModelNotLoadedException(Exception):
    """Raised when model or pipeline cannot be loaded."""
    pass


class PredictionException(Exception):
    """Raised when prediction fails."""
    pass


class ExplainabilityException(Exception):
    """Raised when SHAP explanation fails."""
    pass