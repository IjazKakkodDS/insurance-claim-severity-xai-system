"use client";

import { useMemo, useState, type ReactNode } from "react";
import { API_BASE_URL } from "@/lib/config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type {
  NameType,
  ValueType,
  Payload,
} from "recharts/types/component/DefaultTooltipContent";

type ExplainResponse = {
  prediction?: number;
  explanation?: Record<string, number>;
};

type FeatureContribution = {
  feature: string;
  value: number;
  absValue: number;
};

type ChartDataItem = {
  feature: string;
  fullFeature: string;
  value: number;
};

type FeatureDelta = {
  feature: string;
  baselineValue: number;
  simulatedValue: number;
  delta: number;
  absDelta: number;
  directionChanged: boolean;
};

function normalizeDriverValue(value: string) {
  return value.trim();
}

function buildExplainFeaturePayload(
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

function renderTooltipValue(value: ValueType | undefined) {
  if (typeof value === "number") {
    return value.toFixed(4);
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return "Unavailable";
}

function renderTooltipLabel(
  label: ReactNode,
  payload?: ReadonlyArray<Payload<ValueType, NameType>>
) {
  if (payload && payload.length > 0) {
    const fullFeature = (payload[0]?.payload as ChartDataItem | undefined)
      ?.fullFeature;

    if (fullFeature) {
      return fullFeature;
    }
  }

  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }

  return "Feature";
}

function getPlainLanguageSummary(prediction?: number) {
  if (typeof prediction !== "number") {
    return "Run an explanation request to generate a plain-language summary.";
  }

  if (prediction < 30000) {
    return "The model is currently reading this case as lower severity, with the strongest feature drivers remaining relatively contained.";
  }

  if (prediction < 70000) {
    return "The model is reading this case as moderate severity, with a mix of upward and downward feature signals shaping the final output.";
  }

  return "The model is reading this case as high severity, meaning the strongest active drivers are materially pushing the prediction upward.";
}

function getBusinessInterpretationSummary(
  prediction?: number,
  topFeature?: string
) {
  if (typeof prediction !== "number") {
    return "Business interpretation becomes available once the explanation is generated.";
  }

  const driverText = topFeature
    ? ` The strongest surfaced driver is "${topFeature}".`
    : "";

  if (prediction < 30000) {
    return `Operationally, this scenario is less likely to require aggressive escalation and may align with lower-touch handling pathways.${driverText}`;
  }

  if (prediction < 70000) {
    return `Operationally, this scenario warrants balanced review, as moderate risk factors are contributing to the current predicted severity.${driverText}`;
  }

  return `Operationally, this scenario may justify tighter controls, stronger review attention, or escalation due to elevated predicted severity.${driverText}`;
}

function getWhyThisMattersSummary(featureCount: number) {
  if (!featureCount) {
    return "Why-this-matters analysis becomes available after an explanation is generated.";
  }

  return `This explanation surfaces ${featureCount} feature contributions, helping operators understand not just the predicted outcome, but which drivers are most materially influencing the decision.`;
}

function getChangeNarrative(
  baselinePrediction?: number,
  simulatedPrediction?: number
) {
  if (
    typeof baselinePrediction !== "number" ||
    typeof simulatedPrediction !== "number"
  ) {
    return "Run both baseline and simulated explanations to generate a change narrative.";
  }

  const delta = simulatedPrediction - baselinePrediction;

  if (delta === 0) {
    return "The simulated scenario does not materially change the predicted severity, suggesting the tested adjustment has limited influence on the model output.";
  }

  if (delta > 0) {
    return `The simulated scenario increases predicted severity by ${formatMetric(
      delta
    )}, indicating that the modified inputs intensify the model's risk view.`;
  }

  return `The simulated scenario decreases predicted severity by ${formatMetric(
    Math.abs(delta)
  )}, indicating that the modified inputs soften the model's risk view.`;
}

function getWhatChangedNarrative(
  topDeltaFeature?: FeatureDelta,
  flippedCount?: number
) {
  if (!topDeltaFeature) {
    return "Feature-change narrative becomes available after a simulated explanation is generated.";
  }

  const flipText =
    flippedCount && flippedCount > 0
      ? ` ${flippedCount} feature(s) also changed directional sign.`
      : "";

  if (topDeltaFeature.delta > 0) {
    return `The largest upward contribution shift comes from "${topDeltaFeature.feature}", whose influence increased by ${topDeltaFeature.delta.toFixed(
      4
    )}.${flipText}`;
  }

  if (topDeltaFeature.delta < 0) {
    return `The largest downward contribution shift comes from "${topDeltaFeature.feature}", whose influence decreased by ${Math.abs(
      topDeltaFeature.delta
    ).toFixed(4)}.${flipText}`;
  }

  return `The most changed driver is "${topDeltaFeature.feature}", but its net directional shift is limited.${flipText}`;
}

function getDriverShiftBadge(featureDelta: FeatureDelta) {
  if (featureDelta.directionChanged) return "Direction Flipped";
  if (featureDelta.delta > 0) return "Influence Increased";
  if (featureDelta.delta < 0) return "Influence Decreased";
  return "Stable";
}

// ─── Decision Intelligence Layer helpers ────────────────────────────────────

function getDecisionAlignment(prediction?: number) {
  if (typeof prediction !== "number") {
    return "Decision alignment unavailable.";
  }

  if (prediction < 30000) {
    return "Aligned with low-severity classification. No escalation expected.";
  }

  if (prediction < 70000) {
    return "Aligned with medium-severity classification. Review recommended.";
  }

  return "Aligned with high-severity classification. Escalation likely required.";
}

function getDriverConsistency(
  baselineTop?: string,
  simulatedTop?: string
) {
  if (!baselineTop || !simulatedTop) {
    return "Driver consistency unavailable.";
  }

  if (baselineTop === simulatedTop) {
    return "Primary driver remains consistent across scenarios.";
  }

  return "Primary driver shifts under scenario changes, indicating model sensitivity.";
}

function getRiskAmplification(
  baseline?: number,
  simulated?: number
) {
  if (typeof baseline !== "number" || typeof simulated !== "number") {
    return "Risk signal unavailable.";
  }

  const delta = simulated - baseline;

  if (Math.abs(delta) < 1000) {
    return "Low amplification — stable response.";
  }

  if (delta > 0) {
    return "Risk amplification detected — upward pressure.";
  }

  return "Risk reduction detected — downward pressure.";
}

// ────────────────────────────────────────────────────────────────────────────

export default function ExplainabilityPage() {
  const [cont1, setCont1] = useState("");
  const [cat1, setCat1] = useState("");
  const [cat71, setCat71] = useState("");
  const [cat89, setCat89] = useState("");
  const [cat116, setCat116] = useState("");

  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [simCont1, setSimCont1] = useState("");
  const [simCat1, setSimCat1] = useState("");
  const [simCat71, setSimCat71] = useState("");
  const [simCat89, setSimCat89] = useState("");
  const [simCat116, setSimCat116] = useState("");

  const [simResult, setSimResult] = useState<ExplainResponse | null>(null);
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [simError, setSimError] = useState("");

  const handleExplain = async () => {
    setError("");
    setResult(null);
    setSimResult(null);
    setSimError("");

    if (!cont1 || !cat1) {
      setError("Please enter both cont1 and cat1 before running explainability.");
      return;
    }

    const parsedCont1 = Number(cont1);

    if (Number.isNaN(parsedCont1)) {
      setError("cont1 must be a valid numeric value.");
      return;
    }

    const normalizedCat71 = normalizeDriverValue(cat71);
    const normalizedCat89 = normalizeDriverValue(cat89);
    const normalizedCat116 = normalizeDriverValue(cat116);

    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          features: buildExplainFeaturePayload(
            parsedCont1,
            cat1,
            normalizedCat71,
            normalizedCat89,
            normalizedCat116
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Explainability request failed.");
      }

      const data = await response.json();
      setResult(data);

      setSimCont1(String(parsedCont1));
      setSimCat1(cat1);
      setSimCat71(normalizedCat71);
      setSimCat89(normalizedCat89);
      setSimCat116(normalizedCat116);

      setCat71(normalizedCat71);
      setCat89(normalizedCat89);
      setCat116(normalizedCat116);
    } catch (err) {
      console.error("Explain error:", err);
      setError("Explainability request failed. Please verify inputs and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulationExplain = async () => {
    setSimError("");
    setSimResult(null);

    if (!result) {
      setSimError("Generate the baseline explanation first before running a simulation.");
      return;
    }

    if (!simCont1 || !simCat1) {
      setSimError("Please enter both simulated cont1 and simulated cat1.");
      return;
    }

    const parsedSimCont1 = Number(simCont1);

    if (Number.isNaN(parsedSimCont1)) {
      setSimError("Simulated cont1 must be a valid numeric value.");
      return;
    }

    const normalizedSimCat71 = normalizeDriverValue(simCat71);
    const normalizedSimCat89 = normalizeDriverValue(simCat89);
    const normalizedSimCat116 = normalizeDriverValue(simCat116);

    try {
      setIsSimLoading(true);

      const response = await fetch(`${API_BASE_URL}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          features: buildExplainFeaturePayload(
            parsedSimCont1,
            simCat1,
            normalizedSimCat71,
            normalizedSimCat89,
            normalizedSimCat116
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Simulated explainability request failed.");
      }

      const data = await response.json();
      setSimResult(data);

      setSimCat71(normalizedSimCat71);
      setSimCat89(normalizedSimCat89);
      setSimCat116(normalizedSimCat116);
    } catch (err) {
      console.error("Simulated explain error:", err);
      setSimError("Simulation failed. Please verify the simulated inputs and try again.");
    } finally {
      setIsSimLoading(false);
    }
  };

  const rankedFeatures = useMemo<FeatureContribution[]>(() => {
    if (!result?.explanation) return [];

    return Object.entries(result.explanation)
      .map(([feature, value]) => {
        const numericValue = Number(value);
        return {
          feature,
          value: numericValue,
          absValue: Math.abs(numericValue),
        };
      })
      .sort((a, b) => b.absValue - a.absValue);
  }, [result]);

  const positiveFeatures = rankedFeatures.filter((item) => item.value >= 0);
  const negativeFeatures = rankedFeatures.filter((item) => item.value < 0);

  const chartData: ChartDataItem[] = rankedFeatures
    .slice(0, 10)
    .map((item) => ({
      feature:
        item.feature.length > 26
          ? `${item.feature.slice(0, 26)}...`
          : item.feature,
      fullFeature: item.feature,
      value: item.value,
    }))
    .reverse();

  const simulatedRankedFeatures = useMemo<FeatureContribution[]>(() => {
    if (!simResult?.explanation) return [];

    return Object.entries(simResult.explanation)
      .map(([feature, value]) => {
        const numericValue = Number(value);
        return {
          feature,
          value: numericValue,
          absValue: Math.abs(numericValue),
        };
      })
      .sort((a, b) => b.absValue - a.absValue);
  }, [simResult]);

  const simulatedPositiveFeatures = simulatedRankedFeatures.filter(
    (item) => item.value >= 0
  );
  const simulatedNegativeFeatures = simulatedRankedFeatures.filter(
    (item) => item.value < 0
  );

  const featureDeltas = useMemo<FeatureDelta[]>(() => {
    if (!result?.explanation || !simResult?.explanation) return [];

    const featureSet = new Set([
      ...Object.keys(result.explanation),
      ...Object.keys(simResult.explanation),
    ]);

    return Array.from(featureSet)
      .map((feature) => {
        const baselineValue = Number(result.explanation?.[feature] ?? 0);
        const simulatedValue = Number(simResult.explanation?.[feature] ?? 0);
        const delta = simulatedValue - baselineValue;

        return {
          feature,
          baselineValue,
          simulatedValue,
          delta,
          absDelta: Math.abs(delta),
          directionChanged:
            baselineValue !== 0 &&
            simulatedValue !== 0 &&
            Math.sign(baselineValue) !== Math.sign(simulatedValue),
        };
      })
      .sort((a, b) => b.absDelta - a.absDelta);
  }, [result, simResult]);

  const topChangedDrivers = featureDeltas.slice(0, 10);
  const flippedDrivers = featureDeltas.filter((item) => item.directionChanged);

  const topChangedChartData: ChartDataItem[] = topChangedDrivers
    .map((item) => ({
      feature:
        item.feature.length > 26
          ? `${item.feature.slice(0, 26)}...`
          : item.feature,
      fullFeature: item.feature,
      value: item.delta,
    }))
    .reverse();

  const plainLanguageSummary = getPlainLanguageSummary(result?.prediction);
  const businessInterpretationSummary = getBusinessInterpretationSummary(
    result?.prediction,
    rankedFeatures[0]?.feature
  );
  const whyThisMattersSummary = getWhyThisMattersSummary(rankedFeatures.length);
  const changeNarrative = getChangeNarrative(
    result?.prediction,
    simResult?.prediction
  );
  const whatChangedNarrative = getWhatChangedNarrative(
    topChangedDrivers[0],
    flippedDrivers.length
  );

  const decisionAlignment = getDecisionAlignment(result?.prediction);
  const driverConsistency = getDriverConsistency(
    rankedFeatures[0]?.feature,
    simulatedRankedFeatures[0]?.feature
  );
  const riskAmplification = getRiskAmplification(
    result?.prediction,
    simResult?.prediction
  );

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <section className="flex min-w-0 flex-col gap-3 border-b border-neutral-800 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 sm:text-sm">
          Explainability Workbench
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Model Explainability
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Inspect live model predictions and analyze ranked feature-level
          contributions produced by the explainability service.
        </p>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-400">Input Scenario</p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Explanation Request Builder
              </h2>
            </div>

            <span className="w-fit rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
              SHAP Enabled
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Continuous Input
              </label>
              <input
                type="number"
                placeholder="Enter cont1"
                value={cont1}
                onChange={(e) => setCont1(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
              />
              <p className="text-xs text-neutral-500">
                Numerical input passed into the active model pipeline.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">
                Categorical Input
              </label>
              <input
                type="text"
                placeholder="Enter cat1"
                value={cat1}
                onChange={(e) => setCat1(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
              />
              <p className="text-xs text-neutral-500">
                Category value transformed by the preprocessing pipeline.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">Top Driver Controls</p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Higher-Impact Feature Inputs
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  These controls extend the explainability request with
                  stronger driver-level fields so the attribution layer can
                  surface more visible before-vs-after movement.
                </p>
              </div>

              <span className="w-fit rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={handleExplain}
              disabled={isLoading}
              className="w-full rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isLoading ? "Generating explanation..." : "Generate Explanation"}
            </button>

            <button
              onClick={() => {
                setCont1("");
                setCat1("");
                setCat71("");
                setCat89("");
                setCat116("");
                setResult(null);
                setError("");
                setSimCont1("");
                setSimCat1("");
                setSimCat71("");
                setSimCat89("");
                setSimCat116("");
                setSimResult(null);
                setSimError("");
              }}
              className="w-full rounded-xl border border-neutral-700 bg-transparent px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white sm:w-auto"
            >
              Reset Inputs
            </button>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <p className="text-sm text-neutral-400">Prediction Summary</p>
          <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
            Explainability Output
          </h2>

          {!result && !isLoading && !error && (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5 sm:p-6">
              <p className="text-sm text-neutral-400">
                No explanation has been generated yet. Submit an input scenario
                to retrieve the live prediction and ranked feature
                contributions.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/20 p-5 sm:p-6">
              <p className="text-sm text-neutral-300">
                Running explainability service and computing feature attributions...
              </p>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-green-300">
                  Predicted Severity
                </p>
                <p className="mt-3 break-words text-3xl font-semibold text-white sm:text-4xl">
                  {formatMetric(result.prediction)}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Interpretation
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Positive feature values increase the model output, while
                  negative feature values reduce it relative to the local
                  explanation baseline.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Total surfaced features
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {rankedFeatures.length}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Top driver
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">
                    {rankedFeatures[0]?.feature ?? "Unavailable"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Plain-Language Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {plainLanguageSummary}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Business Interpretation
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {businessInterpretationSummary}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Why This Matters
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {whyThisMattersSummary}
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs uppercase tracking-wide text-blue-300">
                    Decision Intelligence Layer
                  </p>
                  <span className="w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                    System Link
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Decision Alignment
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {decisionAlignment}
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Dominant Driver Stability
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {driverConsistency}
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Risk Amplification Signal
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {riskAmplification}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
        <p className="text-sm text-neutral-400">Visual Attribution</p>
        <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
          Top Feature Contributions
        </h2>

        <div className="mt-6 h-[320px] sm:h-[380px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              No feature contributions available for visualization.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
              >
                <XAxis type="number" stroke="#888" />
                <YAxis
                  type="category"
                  dataKey="feature"
                  stroke="#888"
                  width={110}
                />
                <Tooltip
                  formatter={(value) => renderTooltipValue(value)}
                  labelFormatter={(label, payload) =>
                    renderTooltipLabel(label, payload)
                  }
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-400">Positive Drivers</p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Upward Contributions
              </h2>
            </div>
            <span className="w-fit rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
              Positive
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {positiveFeatures.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5 text-sm text-neutral-500">
                No positive contributions available yet.
              </div>
            ) : (
              positiveFeatures.map((item) => (
                <div
                  key={item.feature}
                  className="rounded-xl border border-neutral-800 bg-black/30 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="break-all text-sm font-medium text-white">
                      {item.feature}
                    </p>
                    <span className="shrink-0 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                      +{item.value.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-400">Negative Drivers</p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Downward Contributions
              </h2>
            </div>
            <span className="w-fit rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
              Negative
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {negativeFeatures.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5 text-sm text-neutral-500">
                No negative contributions available yet.
              </div>
            ) : (
              negativeFeatures.map((item) => (
                <div
                  key={item.feature}
                  className="rounded-xl border border-neutral-800 bg-black/30 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="break-all text-sm font-medium text-white">
                      {item.feature}
                    </p>
                    <span className="shrink-0 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                      {item.value.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {result && (
        <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-400">
                Counterfactual Explainability
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Before vs After Explanation Comparison
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                Modify the baseline scenario and compare how predicted severity
                and feature-level attributions shift under a simulated case.
              </p>
            </div>

            <span className="w-fit rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              Simulation Enabled
            </span>
          </div>

          <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="min-w-0 space-y-4 rounded-xl border border-neutral-800 bg-black/30 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  Simulated Input Scenario
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Run the explainability endpoint again using adjusted inputs to
                  compare how individual feature influences move.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">
                    Simulated cont1
                  </label>
                  <input
                    type="number"
                    placeholder="Enter simulated cont1"
                    value={simCont1}
                    onChange={(e) => setSimCont1(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">
                    Simulated cat1
                  </label>
                  <input
                    type="text"
                    placeholder="Enter simulated cat1"
                    value={simCat1}
                    onChange={(e) => setSimCat1(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">
                    Simulated cat71
                  </label>
                  <input
                    type="text"
                    placeholder="Enter simulated cat71"
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
                    placeholder="Enter simulated cat89"
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
                    placeholder="Enter simulated cat116"
                    value={simCat116}
                    onChange={(e) => setSimCat116(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-neutral-600"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  onClick={handleSimulationExplain}
                  disabled={isSimLoading}
                  className="w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSimLoading ? "Running simulation..." : "Run Simulation"}
                </button>
              </div>

              {simError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {simError}
                </div>
              )}
            </div>

            <div className="min-w-0 rounded-xl border border-neutral-800 bg-black/30 p-4 sm:p-5">
              <p className="text-sm font-medium text-white">
                Simulation Output
              </p>

              {!simResult && !isSimLoading && (
                <div className="mt-4 rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5">
                  <p className="text-sm text-neutral-500">
                    No simulation has been run yet. Adjust the inputs and run a
                    simulation to compare against the baseline.
                  </p>
                </div>
              )}

              {isSimLoading && (
                <div className="mt-4 rounded-xl border border-neutral-800 bg-black/20 p-5">
                  <p className="text-sm text-neutral-300">
                    Running simulation...
                  </p>
                </div>
              )}

              {simResult && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-violet-300">
                      Simulated Predicted Severity
                    </p>
                    <p className="mt-2 break-words text-2xl font-semibold text-white sm:text-3xl">
                      {formatMetric(simResult.prediction)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Change Narrative
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {changeNarrative}
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Baseline prediction
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMetric(result.prediction)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Simulated prediction
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatMetric(simResult.prediction)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Top positive drivers
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {simulatedPositiveFeatures.length}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Top negative drivers
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {simulatedNegativeFeatures.length}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Top surfaced feature
                      </p>
                      <p className="mt-2 break-all text-sm font-semibold text-white">
                        {simulatedRankedFeatures[0]?.feature ?? "Unavailable"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {simResult && (
            <>
              <div className="mt-6 min-w-0 rounded-2xl border border-neutral-800 bg-neutral-950/50 p-4 sm:p-6">
                <p className="text-sm text-neutral-400">Contribution Delta</p>
                <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Top Changed Drivers
                </h3>

                <div className="mt-6 h-[320px] sm:h-[380px]">
                  {topChangedChartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                      No changed driver contributions available for visualization.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topChangedChartData}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                      >
                        <XAxis type="number" stroke="#888" />
                        <YAxis
                          type="category"
                          dataKey="feature"
                          stroke="#888"
                          width={110}
                        />
                        <Tooltip
                          formatter={(value) => renderTooltipValue(value)}
                          labelFormatter={(label, payload) =>
                            renderTooltipLabel(label, payload)
                          }
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {topChangedChartData.map((entry, index) => (
                            <Cell
                              key={`delta-cell-${index}`}
                              fill={entry.value >= 0 ? "#8b5cf6" : "#f97316"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    What Changed
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    {whatChangedNarrative}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Change Interpretation
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    The comparison layer shows not only whether predicted
                    severity moved, but also which features became more or less
                    influential under the simulated scenario.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-400">Changed Drivers</p>
                      <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                        Largest Attribution Shifts
                      </h2>
                    </div>
                    <span className="w-fit rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                      Delta
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {topChangedDrivers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5 text-sm text-neutral-500">
                        No changed drivers available yet.
                      </div>
                    ) : (
                      topChangedDrivers.map((item) => (
                        <div
                          key={item.feature}
                          className="rounded-xl border border-neutral-800 bg-black/30 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="break-all text-sm font-medium text-white">
                                {item.feature}
                              </p>
                              <p className="mt-2 text-xs text-neutral-500">
                                Baseline: {item.baselineValue.toFixed(4)} | Simulated:{" "}
                                {item.simulatedValue.toFixed(4)}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                item.directionChanged
                                  ? "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                                  : item.delta > 0
                                  ? "border border-violet-500/20 bg-violet-500/10 text-violet-300"
                                  : item.delta < 0
                                  ? "border border-orange-500/20 bg-orange-500/10 text-orange-300"
                                  : "border border-neutral-700 bg-neutral-800 text-neutral-300"
                              }`}
                            >
                              {getDriverShiftBadge(item)}
                            </span>
                          </div>

                          <div className="mt-3 text-sm text-neutral-300">
                            Delta:{" "}
                            <span className="font-semibold text-white">
                              {item.delta >= 0 ? "+" : ""}
                              {item.delta.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-400">Directional Shift</p>
                      <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                        Sign-Flipped Features
                      </h2>
                    </div>
                    <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                      Flip
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {flippedDrivers.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5 text-sm text-neutral-500">
                        No feature direction changes detected between baseline and simulated explanations.
                      </div>
                    ) : (
                      flippedDrivers.map((item) => (
                        <div
                          key={item.feature}
                          className="rounded-xl border border-neutral-800 bg-black/30 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <p className="break-all text-sm font-medium text-white">
                              {item.feature}
                            </p>
                            <span className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                              Direction Flipped
                            </span>
                          </div>

                          <div className="mt-3 text-sm text-neutral-300">
                            Baseline:{" "}
                            <span className="font-semibold text-white">
                              {item.baselineValue.toFixed(4)}
                            </span>{" "}
                            → Simulated:{" "}
                            <span className="font-semibold text-white">
                              {item.simulatedValue.toFixed(4)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}