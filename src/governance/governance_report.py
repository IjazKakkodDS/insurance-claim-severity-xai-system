import os
import json
from datetime import datetime


class GovernanceReportGenerator:
    def __init__(self):
        self.version_metadata_path = "artifacts/governance/version_metadata.json"
        self.model_card_path = "artifacts/governance/model_card.json"
        self.validation_report_path = "data/validation_reports/validation_report.json"
        self.evaluation_report_path = "reports/evaluation_report.json"
        self.output_dir = "artifacts/governance"
        self.output_path = os.path.join(self.output_dir, "governance_report.json")

        os.makedirs(self.output_dir, exist_ok=True)

    def _load_json(self, path: str) -> dict:
        if not os.path.exists(path):
            return {}

        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def generate(self) -> dict:
        version_metadata = self._load_json(self.version_metadata_path)
        model_card = self._load_json(self.model_card_path)
        validation_report = self._load_json(self.validation_report_path)
        evaluation_report = self._load_json(self.evaluation_report_path)

        selected_model_name = (
            version_metadata.get("model_summary", {}).get("selected_model_name", "unknown")
        )

        validation_passed = validation_report.get("overall_passed", False)

        governance_report = {
            "governance_report_version": "v1.0.0",
            "generated_at_utc": datetime.utcnow().isoformat(),
            "system_identity": {
                "project_name": "Explainable Insurance Claim Severity ML System",
                "system_type": "Production-style regression ML system with explainability and monitoring",
                "selected_model_name": selected_model_name,
                "task_type": "regression"
            },
            "data_governance": {
                "validation_report_path": self.validation_report_path,
                "processed_training_data_path": "data/processed/train_processed.csv",
                "validation_summary": {
                    "rows": validation_report.get("rows"),
                    "columns": validation_report.get("columns"),
                    "column_check": validation_report.get("column_check", {}),
                    "null_check": validation_report.get("null_check", {}),
                    "duplicate_check": validation_report.get("duplicate_check", {}),
                    "type_check": validation_report.get("type_check", {}),
                    "target_check": validation_report.get("target_check", {}),
                    "overall_passed": validation_passed
                }
            },
            "model_governance": {
                "version_metadata_path": self.version_metadata_path,
                "model_card_path": self.model_card_path,
                "deployment_artifacts": {
                    "best_model": "models/best_model.pkl",
                    "feature_pipeline": "models/feature_pipeline.pkl"
                },
                "evaluation_summary": evaluation_report
            },
            "monitoring_governance": {
                "prediction_log_path": "logs/predictions.json",
                "explanation_log_path": "logs/explanations.json",
                "baseline_stats_path": "artifacts/baseline_stats.json",
                "monitoring_endpoints": [
                    "/monitoring/summary",
                    "/monitoring/drift",
                    "/monitoring/distribution",
                    "/monitoring/evidently"
                ],
                "evidently_report_directory": "reports/evidently",
                "current_monitoring_note": (
                    "Monitoring is implemented with log-based summaries, lightweight drift checks, "
                    "prediction distribution analysis, and Evidently HTML report generation."
                )
            },
            "explainability_governance": {
                "method": "SHAP TreeExplainer",
                "explain_service_path": "src/explainability/shap_service.py",
                "api_endpoint": "/explain",
                "summary": [
                    "raw sparse input is aligned to expected raw features",
                    "missing features are filled using serving defaults",
                    "input is transformed through the saved feature pipeline",
                    "prediction is generated using the selected best model",
                    "top 10 SHAP contributions are returned"
                ],
                "warning": "SHAP contributions support interpretability but do not establish causality."
            },
            "responsible_ai_review": {
                "human_oversight_required": True,
                "fairness_review_completed": False,
                "bias_assessment_completed": False,
                "robustness_testing_completed": False,
                "privacy_review_completed": False,
                "known_limitations": [
                    "synthetic baseline is currently used for initial monitoring comparisons",
                    "fairness and subgroup analysis are not yet implemented",
                    "generic transformed SHAP feature labels reduce business interpretability",
                    "system has not yet undergone adversarial or abuse-case testing"
                ],
                "recommended_next_controls": [
                    "replace synthetic monitoring baseline with historical reference data",
                    "add fairness analysis across meaningful feature groupings if available",
                    "add input abuse testing and edge-case robustness checks",
                    "improve transformed feature name mapping for explanation clarity",
                    "add formal approval checklist before production deployment"
                ]
            },
            "deployment_decision": {
                "current_status": "portfolio_ready_not_production_approved",
                "reasoning": [
                    "core ML system architecture is implemented",
                    "monitoring and explainability are implemented",
                    "data validation exists and is reportable",
                    "responsible AI controls are partially implemented but not fully complete"
                ]
            }
        }

        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(governance_report, f, indent=4)

        return governance_report


if __name__ == "__main__":
    generator = GovernanceReportGenerator()
    governance_report = generator.generate()
    print("Governance report generated successfully.")
    print(json.dumps(governance_report, indent=4))