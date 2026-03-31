"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";

type PredictionResponse = {
  request_id?: string;
  prediction?: number;
};

const VALID_CATEGORY_PATTERN = /^[A-Z]$/;

function normalizeCategory(value: string) {
  return value.trim().toUpperCase();
}

function isValidCategory(value: string) {
  return VALID_CATEGORY_PATTERN.test(normalizeCategory(value));
}

function normalizeDriverValue(value: string) {
  return value.trim();
}

function buildFeaturePayload(
  cont1: number,
  cat1: string,
  cat71?: string,
  cat89?: string,
  cat116?: string
) {
  return {
    cont1,
    cat1,
    ...(cat71 ? { cat71 } : {}),
    ...(cat89 ? { cat89 } : {}),
    ...(cat116 ? { cat116 } : {}),
  };
}

function formatMetric(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Unavailable";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Risk Band Logic
function getRiskBand(prediction?: number) {
  if (typeof prediction !== "number") return "Unavailable";

  if (prediction < 30000) return "Low";
  if (prediction < 70000) return "Medium";
  return "High";
}

// Confidence Proxy
function getConfidence(prediction?: number) {
  if (typeof prediction !== "number") return "Unavailable";

  if (prediction < 30000) return "High Confidence";
  if (prediction < 70000) return "Moderate Confidence";
  return "Lower Confidence";
}

// Decision Summary Generator
function getDecisionSummary(prediction?: number) {
  if (typeof prediction !== "number") return "Unavailable";

  if (prediction < 30000) {
    return "This claim falls into a low severity band. Risk exposure is minimal based on current model signals.";
  }

  if (prediction < 70000) {
    return "This claim is classified under a medium severity band. Moderate risk factors are influencing the prediction.";
  }

  return "This claim is classified as high severity. Strong contributing factors are driving elevated risk exposure.";
}

// Operational Recommendation
function getRecommendation(prediction?: number) {
  if (typeof prediction !== "number") return "Unavailable";

  if (prediction < 30000) {
    return "Proceed with automated approval workflow.";
  }

  if (prediction < 70000) {
    return "Flag for secondary validation or partial manual review.";
  }

  return "Recommend full manual review and risk escalation.";
}

// Delta narrative engine
function getDeltaNarrative(
  delta?: number,
  baselinePrediction?: number,
  simulatedPrediction?: number
) {
  if (
    typeof delta !== "number" ||
    typeof baselinePrediction !== "number" ||
    typeof simulatedPrediction !== "number"
  ) {
    return "Run a simulation to generate a change narrative.";
  }

  if (delta === 0) {
    return "No material change detected between the baseline and simulated scenarios. The predicted severity remains stable under the tested adjustment.";
  }

  if (delta > 0) {
    return `Predicted severity increased by ${formatMetric(
      delta
    )}, indicating elevated expected claim exposure under the simulated scenario.`;
  }

  return `Predicted severity decreased by ${formatMetric(
    Math.abs(delta)
  )}, indicating reduced expected claim exposure under the simulated scenario.`;
}

// Recommendation comparison engine
function getRecommendationShift(
  baselineRecommendation?: string,
  simulatedRecommendation?: string
) {
  if (!baselineRecommendation || !simulatedRecommendation) {
    return "Recommendation shift unavailable.";
  }

  if (baselineRecommendation === simulatedRecommendation) {
    return "No change in operational recommendation between the baseline and simulated scenarios.";
  }

  return `Operational recommendation changed from "${baselineRecommendation}" to "${simulatedRecommendation}".`;
}

// Impact classification
function getDecisionImpact(delta?: number) {
  if (typeof delta !== "number") return "Unavailable";
  if (delta > 0) return "Deterioration";
  if (delta < 0) return "Improvement";
  return "No Change";
}

function getChangedDriverLabels(
  baseline: { cat71: string; cat89: string; cat116: string },
  simulated: { cat71: string; cat89: string; cat116: string }
) {
  const changed: string[] = [];

  if (baseline.cat71 !== simulated.cat71) changed.push("cat71");
  if (baseline.cat89 !== simulated.cat89) changed.push("cat89");
  if (baseline.cat116 !== simulated.cat116) changed.push("cat116");

  return changed;
}

// Business interpretation layer
function getBusinessInterpretation(
  delta?: number,
  baselineRiskBand?: string,
  simulatedRiskBand?: string,
  cont1?: string,
  simCont1?: string,
  cat1?: string,
  simCat1?: string,
  cat71?: string,
  simCat71?: string,
  cat89?: string,
  simCat89?: string,
  cat116?: string,
  simCat116?: string
) {
  if (typeof delta !== "number") {
    return "Business interpretation becomes available once a counterfactual simulation is executed.";
  }

  const cont1Changed = cont1 !== simCont1;
  const cat1Changed = cat1 !== simCat1;

  const changedTopDrivers = getChangedDriverLabels(
    {
      cat71: normalizeDriverValue(cat71 ?? ""),
      cat89: normalizeDriverValue(cat89 ?? ""),
      cat116: normalizeDriverValue(cat116 ?? ""),
    },
    {
      cat71: normalizeDriverValue(simCat71 ?? ""),
      cat89: normalizeDriverValue(simCat89 ?? ""),
      cat116: normalizeDriverValue(simCat116 ?? ""),
    }
  );

  if (delta === 0) {
    if (changedTopDrivers.length > 0) {
      return `The tested scenario altered higher-impact driver controls (${changedTopDrivers.join(
        ", "
      )}) but did not materially move predicted severity. This suggests the current case may sit in a locally stable region of the model response surface.`;
    }

    return "The tested scenario does not materially alter the model output, suggesting that the selected input adjustment has limited impact on predicted severity at the current operating range.";
  }

  if (changedTopDrivers.length > 0) {
    return `The scenario changes higher-impact driver controls (${changedTopDrivers.join(
      ", "
    )}) and moves severity from ${baselineRiskBand} to ${simulatedRiskBand}. This indicates that the model is meaningfully responsive to underlying driver-level segmentation rather than only the surface inputs.`;
  }

  if (cont1Changed && !cat1Changed) {
    return `The scenario suggests that changing cont1 from ${cont1} to ${simCont1} influences severity from ${baselineRiskBand} to ${simulatedRiskBand}, indicating that the model is sensitive to movement in this continuous driver.`;
  }

  if (!cont1Changed && cat1Changed) {
    return `The scenario suggests that changing cat1 from "${cat1}" to "${simCat1}" influences severity from ${baselineRiskBand} to ${simulatedRiskBand}, indicating that category-level segmentation contributes meaningfully to the model decision.`;
  }

  if (cont1Changed && cat1Changed) {
    return `The scenario combines a numerical shift in cont1 and a categorical shift in cat1, resulting in movement from ${baselineRiskBand} to ${simulatedRiskBand}. This indicates that multiple drivers can compound claim severity outcomes.`;
  }

  return "The simulated scenario produced an output shift despite minimal visible input change, which may indicate threshold effects or model sensitivity around the current input combination.";
}

function ScoringPageContent() {
  const searchParams = useSearchParams();

  const [cont1, setCont1] = useState("");
  const [cat1, setCat1] = useState("");
  const [cat71, setCat71] = useState("");
  const [cat89, setCat89] = useState("");
  const [cat116, setCat116] = useState("");

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  // Scenario simulation
  const [simCont1, setSimCont1] = useState("");
  const [simCat1, setSimCat1] = useState("");
  const [simCat71, setSimCat71] = useState("");
  const [simCat89, setSimCat89] = useState("");
  const [simCat116, setSimCat116] = useState("");

  const [simPrediction, setSimPrediction] = useState<PredictionResponse | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [error, setError] = useState("");
  const [simError, setSimError] = useState("");
  const [loadedScenarioId, setLoadedScenarioId] = useState("");
  const [hasPrefilledFromUrl, setHasPrefilledFromUrl] = useState(false);
  const [hasAutoExecuted, setHasAutoExecuted] = useState(false);

  useEffect(() => {
    if (hasPrefilledFromUrl) return;

    const urlCont1 = searchParams.get("cont1");
    const urlCat1 = searchParams.get("cat1");
    const urlCat71 = searchParams.get("cat71");
    const urlCat89 = searchParams.get("cat89");
    const urlCat116 = searchParams.get("cat116");
    const urlScenarioId = searchParams.get("demoScenario");

    const hasScenarioInput =
      urlCont1 || urlCat1 || urlCat71 || urlCat89 || urlCat116 || urlScenarioId;

    if (!hasScenarioInput) {
      setHasPrefilledFromUrl(true);
      return;
    }

    if (urlCont1) setCont1(urlCont1);
    if (urlCat1) setCat1(normalizeCategory(urlCat1));
    if (urlCat71) setCat71(normalizeDriverValue(urlCat71));
    if (urlCat89) setCat89(normalizeDriverValue(urlCat89));
    if (urlCat116) setCat116(normalizeDriverValue(urlCat116));
    if (urlScenarioId) setLoadedScenarioId(urlScenarioId);

    setHasPrefilledFromUrl(true);
  }, [searchParams, hasPrefilledFromUrl]);

  const handleSubmit = async () => {
    setError("");
    setPrediction(null);
    setSimPrediction(null);
    setSimError("");

    const normalizedCat1 = normalizeCategory(cat1);
    const normalizedCat71 = normalizeDriverValue(cat71);
    const normalizedCat89 = normalizeDriverValue(cat89);
    const normalizedCat116 = normalizeDriverValue(cat116);

    if (!cont1 || !normalizedCat1) {
      setError("Please enter both cont1 and cat1 before scoring.");
      return;
    }

    const parsedCont1 = Number(cont1);

    if (Number.isNaN(parsedCont1)) {
      setError("cont1 must be a valid numeric value.");
      return;
    }

    if (!isValidCategory(normalizedCat1)) {
      setError(
        'cat1 must be a valid single category code such as "A", "B", or "C".'
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          features: buildFeaturePayload(
            parsedCont1,
            normalizedCat1,
            normalizedCat71,
            normalizedCat89,
            normalizedCat116
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Prediction request failed.");
      }

      const data = await response.json();
      setPrediction(data);

      // Normalize baseline input state after successful run
      setCat1(normalizedCat1);
      setCat71(normalizedCat71);
      setCat89(normalizedCat89);
      setCat116(normalizedCat116);

      // Pre-fill simulation inputs with baseline values after first successful run
      setSimCont1(String(parsedCont1));
      setSimCat1(normalizedCat1);
      setSimCat71(normalizedCat71);
      setSimCat89(normalizedCat89);
      setSimCat116(normalizedCat116);
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Prediction failed. Please verify the inputs and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPrefilledFromUrl) return;
    if (hasAutoExecuted) return;

    if (loadedScenarioId && cont1 && cat1) {
      setHasAutoExecuted(true);

      const timer = setTimeout(() => {
        handleSubmit();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [hasPrefilledFromUrl, loadedScenarioId, cont1, cat1, hasAutoExecuted]);

  const handleSimulation = async () => {
    setSimError("");
    setSimPrediction(null);

    const normalizedSimCat1 = normalizeCategory(simCat1);
    const normalizedSimCat71 = normalizeDriverValue(simCat71);
    const normalizedSimCat89 = normalizeDriverValue(simCat89);
    const normalizedSimCat116 = normalizeDriverValue(simCat116);

    if (!prediction) {
      setSimError(
        "Generate the baseline prediction first before running a simulation."
      );
      return;
    }

    if (!simCont1 || !normalizedSimCat1) {
      setSimError("Please enter both simulated cont1 and simulated cat1.");
      return;
    }

    const parsedSimCont1 = Number(simCont1);

    if (Number.isNaN(parsedSimCont1)) {
      setSimError("Simulated cont1 must be a valid numeric value.");
      return;
    }

    if (!isValidCategory(normalizedSimCat1)) {
      setSimError(
        'Simulated cat1 must be a valid single category code such as "A", "B", or "C".'
      );
      return;
    }

    try {
      setIsSimLoading(true);

      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          features: buildFeaturePayload(
            parsedSimCont1,
            normalizedSimCat1,
            normalizedSimCat71,
            normalizedSimCat89,
            normalizedSimCat116
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Simulation request failed.");
      }

      const data = await response.json();
      setSimPrediction(data);

      // Normalize simulation state after successful run
      setSimCat1(normalizedSimCat1);
      setSimCat71(normalizedSimCat71);
      setSimCat89(normalizedSimCat89);
      setSimCat116(normalizedSimCat116);
    } catch (err) {
      console.error("Simulation error:", err);
      setSimError(
        "Simulation failed. Please verify the simulated inputs and try again."
      );
    } finally {
      setIsSimLoading(false);
    }
  };

  const riskBand = getRiskBand(prediction?.prediction);
  const confidence = getConfidence(prediction?.prediction);
  const decisionSummary = getDecisionSummary(prediction?.prediction);
  const recommendation = getRecommendation(prediction?.prediction);

  const simulatedRiskBand = getRiskBand(simPrediction?.prediction);
  const simulatedConfidence = getConfidence(simPrediction?.prediction);
  const simulatedDecisionSummary = getDecisionSummary(simPrediction?.prediction);
  const simulatedRecommendation = getRecommendation(simPrediction?.prediction);

  const delta =
    typeof prediction?.prediction === "number" &&
    typeof simPrediction?.prediction === "number"
      ? simPrediction.prediction - prediction.prediction
      : undefined;

  const percentageDelta =
    typeof delta === "number" &&
    typeof prediction?.prediction === "number" &&
    prediction.prediction !== 0
      ? (delta / prediction.prediction) * 100
      : undefined;

  const decisionImpact = getDecisionImpact(delta);
  const deltaNarrative = getDeltaNarrative(
    delta,
    prediction?.prediction,
    simPrediction?.prediction
  );
  const recommendationShift = getRecommendationShift(
    recommendation,
    simulatedRecommendation
  );
  const businessInterpretation = getBusinessInterpretation(
    delta,
    riskBand,
    simulatedRiskBand,
    cont1,
    simCont1,
    normalizeCategory(cat1),
    normalizeCategory(simCat1),
    cat71,
    simCat71,
    cat89,
    simCat89,
    cat116,
    simCat116
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-3 border-b border-neutral-800 pb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Scoring Console
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Claim Severity Scoring
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Submit claim-level inputs to generate a live severity prediction from
          the production model endpoint.
        </p>
      </section>

      {loadedScenarioId && (
        <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">
                Scenario context loaded
              </p>
              <p className="mt-1 text-sm leading-6 text-neutral-100">
                A predefined operational scenario has been routed into the scoring
                workspace. Review the populated inputs, evaluate the prediction,
                and use the counterfactual layer to compare alternative conditions.
              </p>
            </div>

            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              {loadedScenarioId}
            </span>
          </div>
        </section>
      )}

      {/* Main Grid */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Input Panel */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-400">Input Scenario</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Prediction Request Builder
              </h2>
            </div>

            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              Live API
            </span>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <input
              type="number"
              placeholder="Enter cont1"
              value={cont1}
              onChange={(e) => setCont1(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white"
            />

            <input
              type="text"
              placeholder='Enter cat1 (e.g. "A")'
              value={cat1}
              onChange={(e) => setCat1(e.target.value)}
              className="rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white"
            />
          </div>

          {/* Added: top driver controls */}
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-400">Top Driver Controls</p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Higher-Impact Feature Inputs
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  These controls extend the baseline request with stronger
                  driver-level fields so the scoring layer can surface more
                  visible scenario sensitivity.
                </p>
              </div>

              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                Extended Inputs
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  cat71
                </label>
                <input
                  type="text"
                  placeholder="Enter cat71"
                  value={cat71}
                  onChange={(e) => setCat71(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  cat89
                </label>
                <input
                  type="text"
                  placeholder="Enter cat89"
                  value={cat89}
                  onChange={(e) => setCat89(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  cat116
                </label>
                <input
                  type="text"
                  placeholder="Enter cat116"
                  value={cat116}
                  onChange={(e) => setCat116(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              {isLoading ? "Running..." : "Generate Prediction"}
            </button>
          </div>

          {error && <div className="mt-5 text-sm text-red-400">{error}</div>}
        </div>

        {/* Result Panel */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
          {!prediction && <p className="text-neutral-500">No prediction yet.</p>}

          {prediction && (
            <>
              <div className="text-3xl font-bold text-white">
                {formatMetric(prediction.prediction)}
              </div>

              <div className="text-sm text-neutral-400">
                Risk Band:{" "}
                <span className="text-white font-semibold">{riskBand}</span>
              </div>

              <div className="text-sm text-neutral-400">
                Confidence:{" "}
                <span className="text-white font-semibold">{confidence}</span>
              </div>

              <div className="text-sm text-neutral-300">{decisionSummary}</div>

              <div className="text-sm text-yellow-400">{recommendation}</div>

              <div className="text-xs text-neutral-500">
                Request ID: {prediction.request_id}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Scenario Simulation Layer */}
      {prediction && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-400">
                Counterfactual Workspace
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Scenario Simulation
              </h2>
            </div>

            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              What-if Analysis
            </span>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            {/* Simulation Input Panel */}
            <div className="space-y-4 rounded-xl border border-neutral-800 bg-black/30 p-5">
              <div>
                <p className="text-sm font-medium text-white">
                  Simulated Input Scenario
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Modify the baseline inputs and compare how the predicted
                  severity changes under a counterfactual scenario.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  placeholder="Simulated cont1"
                  value={simCont1}
                  onChange={(e) => setSimCont1(e.target.value)}
                  className="rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white"
                />

                <input
                  type="text"
                  placeholder='Simulated cat1 (e.g. "A")'
                  value={simCat1}
                  onChange={(e) => setSimCat1(e.target.value)}
                  className="rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white"
                />
              </div>

              {/* Added: simulated top driver controls */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-neutral-400">
                      Top Driver Simulation Panel
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      Higher-Impact Counterfactual Controls
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      Adjust higher-impact driver fields directly to create a
                      more visible before-vs-after model response.
                    </p>
                  </div>

                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                    Driver Shift
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                      Simulated cat71
                    </label>
                    <input
                      type="text"
                      placeholder="Simulated cat71"
                      value={simCat71}
                      onChange={(e) => setSimCat71(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                      Simulated cat89
                    </label>
                    <input
                      type="text"
                      placeholder="Simulated cat89"
                      value={simCat89}
                      onChange={(e) => setSimCat89(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                      Simulated cat116
                    </label>
                    <input
                      type="text"
                      placeholder="Simulated cat116"
                      value={simCat116}
                      onChange={(e) => setSimCat116(e.target.value)}
                      className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSimulation}
                  disabled={isSimLoading}
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  {isSimLoading ? "Running simulation..." : "Run Simulation"}
                </button>

                <button
                  onClick={() => {
                    setSimCont1(cont1);
                    setSimCat1(normalizeCategory(cat1));
                    setSimCat71(cat71);
                    setSimCat89(cat89);
                    setSimCat116(cat116);
                    setSimPrediction(null);
                    setSimError("");
                  }}
                  className="rounded-xl border border-neutral-700 bg-transparent px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                >
                  Reset to Baseline
                </button>
              </div>

              {simError && (
                <div className="text-sm text-red-400">{simError}</div>
              )}
            </div>

            {/* Simulation Summary */}
            <div className="space-y-4 rounded-xl border border-neutral-800 bg-black/30 p-5">
              <div>
                <p className="text-sm text-neutral-400">Simulation Status</p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  Comparison Overview
                </h3>
              </div>

              {!simPrediction && (
                <div className="rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5">
                  <p className="text-sm text-neutral-400">
                    No simulation has been run yet. Adjust the scenario inputs
                    and execute the simulation to compare against the baseline
                    prediction.
                  </p>
                </div>
              )}

              {simPrediction && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Baseline Prediction
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMetric(prediction.prediction)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-violet-300">
                        Simulated Prediction
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMetric(simPrediction.prediction)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Delta Intelligence
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-neutral-300">
                      <p>
                        Absolute Change:{" "}
                        <span className="font-semibold text-white">
                          {formatMetric(delta)}
                        </span>
                      </p>
                      <p>
                        Percentage Change:{" "}
                        <span className="font-semibold text-white">
                          {typeof percentageDelta === "number"
                            ? `${percentageDelta.toFixed(2)}%`
                            : "Unavailable"}
                        </span>
                      </p>
                      <p>
                        Risk Movement:{" "}
                        <span className="font-semibold text-white">
                          {riskBand} → {simulatedRiskBand}
                        </span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Detailed Comparison */}
          {simPrediction && (
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-sm text-neutral-400">
                  Baseline Decision View
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  Current Scenario
                </h3>

                <div className="mt-4 space-y-3">
                  <div className="text-sm text-neutral-400">
                    Risk Band:{" "}
                    <span className="font-semibold text-white">{riskBand}</span>
                  </div>
                  <div className="text-sm text-neutral-400">
                    Confidence:{" "}
                    <span className="font-semibold text-white">
                      {confidence}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-300">
                    {decisionSummary}
                  </div>
                  <div className="text-sm text-yellow-400">
                    {recommendation}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-5">
                <p className="text-sm text-violet-300">
                  Simulated Decision View
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  Counterfactual Scenario
                </h3>

                <div className="mt-4 space-y-3">
                  <div className="text-sm text-neutral-200">
                    Risk Band:{" "}
                    <span className="font-semibold text-white">
                      {simulatedRiskBand}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-200">
                    Confidence:{" "}
                    <span className="font-semibold text-white">
                      {simulatedConfidence}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-100">
                    {simulatedDecisionSummary}
                  </div>
                  <div className="text-sm text-yellow-300">
                    {simulatedRecommendation}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Counterfactual Intelligence Layer */}
          {simPrediction && (
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-400">
                    Counterfactual Intelligence
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-white">
                    Decision Intelligence Summary
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                    This layer translates the baseline-to-simulated change into
                    business-facing decision intelligence, operational movement,
                    and scenario-level interpretation.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    decisionImpact === "Improvement"
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : decisionImpact === "Deterioration"
                      ? "border border-red-500/20 bg-red-500/10 text-red-300"
                      : "border border-neutral-700 bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {decisionImpact}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Decision Impact
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {decisionImpact}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Baseline Risk
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {riskBand}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Simulated Risk
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {simulatedRiskBand}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Severity Change Narrative
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    {deltaNarrative}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Recommendation Shift
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    {recommendationShift}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/10 p-5">
                <p className="text-xs uppercase tracking-wide text-violet-300">
                  Business Interpretation
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-100">
                  {businessInterpretation}
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Operator Guidance
                </p>
                <div className="mt-3 space-y-2 text-sm text-neutral-300">
                  <p>
                    Baseline recommendation:{" "}
                    <span className="font-semibold text-white">
                      {recommendation}
                    </span>
                  </p>
                  <p>
                    Simulated recommendation:{" "}
                    <span className="font-semibold text-white">
                      {simulatedRecommendation}
                    </span>
                  </p>
                  <p>
                    Suggested interpretation:{" "}
                    <span className="text-white">
                      {decisionImpact === "Deterioration"
                        ? "The tested scenario increases expected severity and may justify stronger review controls, manual escalation, or additional documentation checks."
                        : decisionImpact === "Improvement"
                        ? "The tested scenario reduces expected severity and may support a less restrictive handling path, subject to policy controls."
                        : "The tested scenario does not materially alter the expected handling pathway, suggesting operational stability for this case."}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ScoringPageFallback() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 border-b border-neutral-800 pb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Scoring Console
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Claim Severity Scoring
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Loading scoring workspace...
        </p>
      </section>
    </div>
  );
}

export default function ScoringPage() {
  return (
    <Suspense fallback={<ScoringPageFallback />}>
      <ScoringPageContent />
    </Suspense>
  );
}