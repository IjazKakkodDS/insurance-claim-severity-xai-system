"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type DistributionSummary = {
  total_predictions?: number;
  min_prediction?: number;
  max_prediction?: number;
  mean_prediction?: number;
  median_prediction?: number;
  std_prediction?: number;
  p25_prediction?: number;
  p75_prediction?: number;
  recent_predictions?: number[];
};

type MonitoringResponse = {
  distribution?: DistributionSummary;
};

type AlertSeverity = "Low" | "Moderate" | "High" | "Critical" | "Unknown";

function formatMetric(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Unavailable";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDriftLevel(std?: number) {
  if (typeof std !== "number") return "Unknown";

  if (std < 1000) return "Stable";
  if (std < 5000) return "Moderate Drift";
  if (std < 10000) return "High Drift";
  return "Critical Drift";
}

function getDriftSeverity(std?: number): AlertSeverity {
  if (typeof std !== "number") return "Unknown";
  if (std < 1000) return "Low";
  if (std < 5000) return "Moderate";
  if (std < 10000) return "High";
  return "Critical";
}

function getSkewSignal(mean?: number, median?: number) {
  if (typeof mean !== "number" || typeof median !== "number") {
    return "Unknown";
  }

  const diff = Math.abs(mean - median);

  if (diff < 1000) return "Balanced";
  if (diff < 5000) return "Moderately Skewed";
  return "Highly Skewed";
}

function getConcentrationSignal(p25?: number, p75?: number) {
  if (typeof p25 !== "number" || typeof p75 !== "number") {
    return "Unknown";
  }

  const iqr = p75 - p25;

  if (iqr < 2000) return "Highly Concentrated";
  if (iqr < 8000) return "Moderately Concentrated";
  return "Broadly Distributed";
}

function getVolatilitySignal(std?: number) {
  if (typeof std !== "number") return "Unknown";

  if (std < 1000) return "Low Volatility";
  if (std < 5000) return "Moderate Volatility";
  if (std < 10000) return "High Volatility";
  return "Extreme Volatility";
}

function getTrendDirection(recentPredictions: number[]) {
  if (recentPredictions.length < 2) return "Insufficient Data";

  const first = recentPredictions[0];
  const last = recentPredictions[recentPredictions.length - 1];
  const delta = last - first;

  if (Math.abs(delta) < 1000) return "Flat";
  if (delta > 0) return "Upward";
  return "Downward";
}

function getRangeWidth(min?: number, max?: number) {
  if (typeof min !== "number" || typeof max !== "number") return undefined;
  return max - min;
}

function generateInsights(dist: DistributionSummary) {
  const insights: string[] = [];

  if (typeof dist.std_prediction === "number") {
    if (dist.std_prediction < 1000) {
      insights.push(
        "Predictions are tightly clustered, indicating stable model behavior."
      );
    } else if (dist.std_prediction > 5000) {
      insights.push(
        "High variance detected — potential model instability or diverse inputs."
      );
    }
  }

  if (
    typeof dist.mean_prediction === "number" &&
    typeof dist.median_prediction === "number"
  ) {
    const diff = Math.abs(dist.mean_prediction - dist.median_prediction);

    if (diff > 5000) {
      insights.push(
        "Mean and median divergence suggests skewed prediction distribution."
      );
    }
  }

  if (
    typeof dist.p75_prediction === "number" &&
    typeof dist.p25_prediction === "number"
  ) {
    const spread = dist.p75_prediction - dist.p25_prediction;

    if (spread < 2000) {
      insights.push(
        "Low interquartile range indicates concentrated prediction outputs."
      );
    }
  }

  if (insights.length === 0) {
    insights.push(
      "No abnormal patterns detected. Model behavior appears consistent."
    );
  }

  return insights;
}

function getAlertState(
  driftSeverity: AlertSeverity,
  skewSignal: string,
  concentrationSignal: string
) {
  if (driftSeverity === "Critical") {
    return {
      title: "Critical monitoring condition detected",
      message:
        "Output variance has reached a critical level. Immediate validation and investigation are recommended.",
    };
  }

  if (driftSeverity === "High" || skewSignal === "Highly Skewed") {
    return {
      title: "Elevated monitoring risk detected",
      message:
        "Recent monitoring signals suggest stronger-than-normal output movement or asymmetric distribution behavior.",
    };
  }

  if (
    driftSeverity === "Moderate" ||
    concentrationSignal === "Highly Concentrated"
  ) {
    return {
      title: "Moderate monitoring attention advised",
      message:
        "Distribution signals remain usable, but concentration or variance should be reviewed for early-stage drift patterns.",
    };
  }

  return {
    title: "Monitoring state appears stable",
    message:
      "Current output behavior does not indicate material instability based on available observability signals.",
    };
}

function getOperatorGuidance(
  driftSeverity: AlertSeverity,
  trendDirection: string,
  skewSignal: string
) {
  if (driftSeverity === "Critical") {
    return "Escalate immediately for model validation review, inspect recent inputs, and verify whether a production rollback decision may be required.";
  }

  if (driftSeverity === "High") {
    return "Review recent scoring patterns, compare current outputs against expected business ranges, and inspect for abrupt population or feature mix changes.";
  }

  if (trendDirection === "Upward" && skewSignal === "Highly Skewed") {
    return "Investigate whether the model is increasingly assigning higher severity outputs to a narrower set of recent cases.";
  }

  if (trendDirection === "Downward" && skewSignal === "Highly Skewed") {
    return "Investigate whether recent outputs are compressing downward in a way that could mask genuinely high-risk cases.";
  }

  return "Continue standard monitoring. No immediate corrective action is indicated from the currently surfaced signals.";
}

export default function MonitoringPage() {
  const [summary, setSummary] = useState<
    MonitoringResponse | DistributionSummary | null
  >(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMonitoring = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/monitoring/distribution`);

        if (!response.ok) {
          throw new Error("Failed to load monitoring data.");
        }

        const data = await response.json();
        setSummary(data);
      } catch (err) {
        console.error("Monitoring fetch error:", err);
        setError("Failed to load monitoring data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonitoring();
  }, []);

  const distribution: DistributionSummary | null =
    summary && "distribution" in summary
      ? summary.distribution ?? null
      : (summary as DistributionSummary | null);

  const recentPredictions = distribution?.recent_predictions ?? [];

  const chartData = recentPredictions.map((value, index) => ({
    name: `#${index + 1}`,
    value,
  }));

  const driftLevel = getDriftLevel(distribution?.std_prediction);
  const insights = distribution ? generateInsights(distribution) : [];

  const driftSeverity = getDriftSeverity(distribution?.std_prediction);
  const skewSignal = getSkewSignal(
    distribution?.mean_prediction,
    distribution?.median_prediction
  );
  const concentrationSignal = getConcentrationSignal(
    distribution?.p25_prediction,
    distribution?.p75_prediction
  );
  const volatilitySignal = getVolatilitySignal(distribution?.std_prediction);
  const trendDirection = getTrendDirection(recentPredictions);
  const rangeWidth = getRangeWidth(
    distribution?.min_prediction,
    distribution?.max_prediction
  );

  const alertState = getAlertState(
    driftSeverity,
    skewSignal,
    concentrationSignal
  );
  const operatorGuidance = getOperatorGuidance(
    driftSeverity,
    trendDirection,
    skewSignal
  );

  const trendStats = useMemo(() => {
    if (recentPredictions.length < 2) {
      return {
        latestDelta: undefined,
        latestDeltaPct: undefined,
      };
    }

    const prev = recentPredictions[recentPredictions.length - 2];
    const latest = recentPredictions[recentPredictions.length - 1];
    const delta = latest - prev;
    const pct = prev !== 0 ? (delta / prev) * 100 : undefined;

    return {
      latestDelta: delta,
      latestDeltaPct: pct,
    };
  }, [recentPredictions]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 border-b border-neutral-800 pb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Observability Center
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Monitoring Dashboard
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Review prediction activity, output distribution behavior, and core
          monitoring signals from the live model serving layer.
        </p>
      </section>

      {isLoading && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-300">
            Loading monitoring metrics from the observability endpoint...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && distribution && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Total Predictions</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {distribution.total_predictions ?? "Unavailable"}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Total tracked scoring outputs in the monitoring log.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Mean Prediction</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {formatMetric(distribution.mean_prediction)}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Average output generated by the production model.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Prediction Range</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {typeof distribution.min_prediction === "number" &&
                typeof distribution.max_prediction === "number"
                  ? `${formatMetric(distribution.min_prediction)} — ${formatMetric(
                      distribution.max_prediction
                    )}`
                  : "Unavailable"}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Minimum to maximum observed predictions.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Std Deviation</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {formatMetric(distribution.std_prediction)}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Output variability across recent prediction activity.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Drift Signal</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {driftLevel}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Indicates stability of model output distribution.
              </p>
            </div>
          </section>

          {/* Added: observability signals row */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Skew Signal</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {skewSignal}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Compares mean and median to detect asymmetry in outputs.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Concentration Signal</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {concentrationSignal}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Interquartile spread of recent prediction activity.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Volatility Signal</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {volatilitySignal}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                High-level interpretation of distribution variability.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Trend Direction</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {trendDirection}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Directional view across recent prediction observations.
              </p>
            </div>
          </section>

          {/* Added: operator alert panel */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-400">Operator Alert Layer</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Monitoring Alert State
                </h2>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  driftSeverity === "Critical"
                    ? "border border-red-500/20 bg-red-500/10 text-red-300"
                    : driftSeverity === "High"
                    ? "border border-orange-500/20 bg-orange-500/10 text-orange-300"
                    : driftSeverity === "Moderate"
                    ? "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {driftSeverity}
              </span>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Alert Summary
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {alertState.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  {alertState.message}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Operator Guidance
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  {operatorGuidance}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">Prediction Distribution</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              Output Trend Visualization
            </h2>

            <div className="mt-6 h-[250px]">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  No data available for visualization.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Added: time-style trend chart */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">Trend Intelligence</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              Sequential Prediction Movement
            </h2>

            <div className="mt-6 h-[280px]">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  No trend data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Latest Movement
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {typeof trendStats.latestDelta === "number"
                    ? `${trendStats.latestDelta >= 0 ? "+" : ""}${formatMetric(
                        trendStats.latestDelta
                      )}`
                    : "Unavailable"}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Latest Movement %
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {typeof trendStats.latestDeltaPct === "number"
                    ? `${trendStats.latestDeltaPct.toFixed(2)}%`
                    : "Unavailable"}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Range Width
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatMetric(rangeWidth)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">Insight Engine</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">
              Monitoring Insights
            </h2>

            <div className="mt-6 space-y-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-sm text-neutral-300"
                >
                  {insight}
                </div>
              ))}
            </div>
          </section>

          {/* Added: advanced observability summary */}
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-400">Observability Summary</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Behavioral Interpretation
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Distribution Behavior
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Current output behavior is characterized by{" "}
                    <span className="font-semibold text-white">{volatilitySignal}</span>,{" "}
                    <span className="font-semibold text-white">{skewSignal}</span>{" "}
                    structure, and{" "}
                    <span className="font-semibold text-white">
                      {concentrationSignal}
                    </span>{" "}
                    output dispersion.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Trend Interpretation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    The recent prediction sequence shows a{" "}
                    <span className="font-semibold text-white">
                      {trendDirection}
                    </span>{" "}
                    directional pattern, which helps operators judge whether the
                    live system is remaining steady or moving toward a different
                    scoring regime.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Why This Matters
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Observability is not just about logging outputs. It helps
                    detect instability, silent drift, compressed predictions,
                    and distribution shifts before they become business or risk
                    management failures.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-400">Operator Review</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Observability Checklist
              </h2>

              <div className="mt-6 space-y-3">
                {[
                  `Review drift severity: ${driftSeverity}`,
                  `Validate whether trend direction (${trendDirection}) aligns with expected case mix.`,
                  `Check whether skew signal (${skewSignal}) is consistent with business context.`,
                  `Confirm whether concentration (${concentrationSignal}) suggests output compression.`,
                  "Escalate only if multiple signals move adversely at the same time.",
                ].map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-sm text-neutral-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-400">
                    Distribution Metrics
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Prediction Summary
                  </h2>
                </div>

                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                  Live Monitoring
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Minimum Prediction
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatMetric(distribution.min_prediction)}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Maximum Prediction
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatMetric(distribution.max_prediction)}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Median Prediction
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatMetric(distribution.median_prediction)}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Mean Prediction
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatMetric(distribution.mean_prediction)}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    P25
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatMetric(distribution.p25_prediction)}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    P75
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatMetric(distribution.p75_prediction)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Monitoring Interpretation
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  These statistics summarize the distribution of recent model
                  outputs and help identify concentration, spread, and possible
                  changes in scoring behavior over time.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-400">Recent Activity</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Prediction Feed
              </h2>

              {recentPredictions.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-neutral-800 bg-black/20 p-6">
                  <p className="text-sm text-neutral-400">
                    No recent predictions are available yet.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {recentPredictions.map((value, index) => (
                    <div
                      key={`${value}-${index}`}
                      className="rounded-xl border border-neutral-800 bg-black/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            Prediction #{index + 1}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {formatMetric(value)}
                          </p>
                        </div>

                        <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                          Logged
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}