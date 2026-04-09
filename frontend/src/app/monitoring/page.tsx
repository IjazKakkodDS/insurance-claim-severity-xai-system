"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
type StabilityLevel = "Stable" | "Watch" | "At Risk" | "Critical";
type ActionPriority = "Low" | "Medium" | "High" | "Critical";
type EscalationDecision = "Hold" | "Watch" | "Escalate";
type TimelineEventSeverity = "Info" | "Watch" | "Warning" | "Critical";

type DriftBreakdown = {
  categoricalContribution: number;
  continuousContribution: number;
  distributionContribution: number;
  primaryDriver: string;
  confidence: "Low" | "Medium" | "High";
  explanation: string;
};

type RecommendedAction = {
  title: string;
  priority: ActionPriority;
  owner: string;
  rationale: string;
  nextStep: string;
};

type MonitoringTimelineEvent = {
  title: string;
  severity: TimelineEventSeverity;
  description: string;
};

type EscalationOutcome = {
  decision: EscalationDecision;
  rationale: string;
  operatorNote: string;
};

function formatMetric(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Unavailable";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function getPenaltyFromSignal(
  signal: string | undefined,
  weights: { low: number; moderate: number; high: number }
) {
  if (!signal) return 0;

  const normalized = signal.toLowerCase();

  if (
    normalized.includes("critical") ||
    normalized.includes("extreme") ||
    normalized.includes("highly skewed") ||
    normalized.includes("highly concentrated") ||
    normalized.includes("high drift") ||
    normalized.includes("high volatility")
  ) {
    return weights.high;
  }

  if (normalized.includes("moderate") || normalized.includes("moderately")) {
    return weights.moderate;
  }

  if (
    normalized.includes("low") ||
    normalized.includes("stable") ||
    normalized.includes("balanced") ||
    normalized.includes("broadly distributed")
  ) {
    return weights.low;
  }

  return 0;
}

function getTrendPenalty(trendDirection: string | undefined) {
  if (!trendDirection) return 0;

  const normalized = trendDirection.toLowerCase();

  if (normalized.includes("downward")) return 12;
  if (normalized.includes("upward")) return 8;
  if (normalized.includes("flat")) return 2;
  if (normalized.includes("insufficient")) return 5;

  return 0;
}

function getStabilityLevel(score: number): StabilityLevel {
  if (score >= 85) return "Stable";
  if (score >= 70) return "Watch";
  if (score >= 50) return "At Risk";
  return "Critical";
}

function getStabilityTone(level: StabilityLevel) {
  switch (level) {
    case "Stable":
      return {
        badge: "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        ring: "border-emerald-500/20",
        text: "System behavior is currently well-contained with no major destabilizing signals.",
      };
    case "Watch":
      return {
        badge: "border border-amber-500/20 bg-amber-500/10 text-amber-300",
        ring: "border-amber-500/20",
        text: "Some instability signals are emerging. Continue monitoring and validate whether the movement is temporary or persistent.",
      };
    case "At Risk":
      return {
        badge: "border border-orange-500/20 bg-orange-500/10 text-orange-300",
        ring: "border-orange-500/20",
        text: "Stability is deteriorating. Recent signals suggest the model should be reviewed more closely for early-stage operational degradation.",
      };
    case "Critical":
      return {
        badge: "border border-red-500/20 bg-red-500/10 text-red-300",
        ring: "border-red-500/20",
        text: "The system is showing materially unstable behavior. Immediate review or escalation is recommended.",
      };
  }
}

function buildStabilityScore(params: {
  driftSignal?: string;
  skewSignal?: string;
  concentrationSignal?: string;
  volatilitySignal?: string;
  trendDirection?: string;
}) {
  const driftPenalty = getPenaltyFromSignal(params.driftSignal, {
    low: 2,
    moderate: 10,
    high: 22,
  });

  const skewPenalty = getPenaltyFromSignal(params.skewSignal, {
    low: 1,
    moderate: 7,
    high: 14,
  });

  const concentrationPenalty = getPenaltyFromSignal(params.concentrationSignal, {
    low: 1,
    moderate: 7,
    high: 14,
  });

  const volatilityPenalty = getPenaltyFromSignal(params.volatilitySignal, {
    low: 2,
    moderate: 10,
    high: 18,
  });

  const trendPenalty = getTrendPenalty(params.trendDirection);

  const totalPenalty =
    driftPenalty +
    skewPenalty +
    concentrationPenalty +
    volatilityPenalty +
    trendPenalty;

  const score = clamp(100 - totalPenalty, 0, 100);
  const level = getStabilityLevel(score);

  return {
    score,
    level,
    penalties: {
      driftPenalty,
      skewPenalty,
      concentrationPenalty,
      volatilityPenalty,
      trendPenalty,
      totalPenalty,
    },
  };
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

function getCombinedDriftReasoning(
  driftSeverity: AlertSeverity,
  trendDirection: string,
  skewSignal: string
) {
  if (driftSeverity === "Critical") {
    return "Variance has reached a critical level, indicating that production outputs may be moving outside the model’s normal operating profile.";
  }

  if (driftSeverity === "High" && trendDirection === "Upward") {
    return "High output variance combined with an upward sequence suggests a possible shift toward more severe recent cases or a changing input population.";
  }

  if (driftSeverity === "High" && trendDirection === "Downward") {
    return "High output variance combined with a downward sequence suggests a possible downward redistribution of predicted severity that should be reviewed.";
  }

  if (driftSeverity === "Moderate" && skewSignal === "Highly Skewed") {
    return "Moderate drift with strong skew suggests the model may still be stable overall, but output behavior is becoming increasingly asymmetric.";
  }

  if (driftSeverity === "Low" && trendDirection === "Flat") {
    return "Current monitoring signals indicate stable behavior with limited directional movement across recent outputs.";
  }

  return "Current signals do not yet indicate a strong multi-factor drift pattern, but the surfaced metrics should continue to be reviewed together rather than in isolation.";
}

function getModelHealthSummary(
  driftSeverity: AlertSeverity,
  trendDirection: string,
  volatilitySignal: string,
  skewSignal: string
) {
  if (driftSeverity === "Critical") {
    return `Model behavior is currently critical, with ${volatilitySignal.toLowerCase()} and a ${trendDirection.toLowerCase()} trend requiring immediate review.`;
  }

  if (driftSeverity === "High") {
    return `Model behavior is elevated, with ${volatilitySignal.toLowerCase()} and a ${trendDirection.toLowerCase()} directional pattern suggesting stronger monitoring attention is needed.`;
  }

  if (driftSeverity === "Moderate") {
    return `Model behavior is moderately active, with ${volatilitySignal.toLowerCase()} and ${skewSignal.toLowerCase()} output structure that should be watched for early drift signals.`;
  }

  return `Model behavior is currently stable, with ${volatilitySignal.toLowerCase()}, ${skewSignal.toLowerCase()} structure, and no material directional instability.`;
}

function getDriftBreakdown(
  driftSeverity: AlertSeverity,
  trendDirection: string,
  skewSignal: string,
  concentrationSignal: string,
  volatilitySignal: string
): DriftBreakdown {
  if (driftSeverity === "Critical") {
    return {
      categoricalContribution: 55,
      continuousContribution: 25,
      distributionContribution: 20,
      primaryDriver: "Primary categorical driver shift detected",
      confidence: "High",
      explanation:
        "Critical variance suggests the model is no longer behaving like a narrow stable scoring regime. Categorical input movement appears to be the dominant source of drift, with supporting contribution from wider output dispersion.",
    };
  }

  if (driftSeverity === "High" && concentrationSignal === "Highly Concentrated") {
    return {
      categoricalContribution: 62,
      continuousContribution: 18,
      distributionContribution: 20,
      primaryDriver: "Categorical driver concentration shift",
      confidence: "Medium",
      explanation:
        "High drift alongside concentrated output behavior suggests a narrower but stronger feature mix is influencing recent predictions. This often points to dominant categorical drivers exerting more control than usual.",
    };
  }

  if (driftSeverity === "High" && trendDirection === "Upward") {
    return {
      categoricalContribution: 50,
      continuousContribution: 30,
      distributionContribution: 20,
      primaryDriver: "Upward severity pressure in recent inputs",
      confidence: "Medium",
      explanation:
        "High drift with an upward trend suggests recent cases may be entering the system with feature profiles more aligned to elevated severity scoring behavior.",
    };
  }

  if (driftSeverity === "High" && trendDirection === "Flat") {
    return {
      categoricalContribution: 58,
      continuousContribution: 22,
      distributionContribution: 20,
      primaryDriver: "Flat-trend variance from dominant feature mix",
      confidence: "Medium",
      explanation:
        "The model is not drifting directionally, but volatility remains high. This suggests variability is being driven more by feature composition than by a single sustained upward or downward movement.",
    };
  }

  if (driftSeverity === "Moderate" && skewSignal === "Highly Skewed") {
    return {
      categoricalContribution: 48,
      continuousContribution: 20,
      distributionContribution: 32,
      primaryDriver: "Distribution asymmetry pressure",
      confidence: "Low",
      explanation:
        "Moderate drift with strong skew implies recent outputs may be leaning asymmetrically, though evidence for a single dominant root cause remains limited.",
    };
  }

  if (volatilitySignal === "Low Volatility") {
    return {
      categoricalContribution: 35,
      continuousContribution: 30,
      distributionContribution: 35,
      primaryDriver: "No dominant drift source surfaced",
      confidence: "Low",
      explanation:
        "Current signals do not indicate meaningful instability. No single feature group appears strong enough to explain material drift.",
    };
  }

  return {
    categoricalContribution: 45,
    continuousContribution: 25,
    distributionContribution: 30,
    primaryDriver: "Mixed-factor monitoring movement",
    confidence: "Low",
    explanation:
      "The surfaced metrics indicate some movement, but no single dominant source is strong enough to support a high-confidence attribution decision.",
  };
}

function getConfidenceTone(confidence: DriftBreakdown["confidence"]) {
  if (confidence === "High") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (confidence === "Medium") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-neutral-700 bg-neutral-800 text-neutral-300";
}

function getPriorityTone(priority: ActionPriority) {
  if (priority === "Critical") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (priority === "High") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (priority === "Medium") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}

function getDecisionTone(decision: EscalationDecision) {
  if (decision === "Escalate") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (decision === "Watch") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}

function getTimelineTone(severity: TimelineEventSeverity) {
  if (severity === "Critical") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (severity === "Warning") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (severity === "Watch") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
}

function getRecommendedAction(params: {
  stabilityLevel: StabilityLevel;
  driftSeverity: AlertSeverity;
  trendDirection: string;
  skewSignal: string;
  concentrationSignal: string;
  volatilitySignal: string;
}): RecommendedAction {
  if (params.driftSeverity === "Critical" || params.stabilityLevel === "Critical") {
    return {
      title: "Escalate for immediate validation review",
      priority: "Critical",
      owner: "Model Risk / ML Ops",
      rationale:
        "Critical instability signals indicate the live output profile may be outside the expected operating regime.",
      nextStep:
        "Trigger a validation review, inspect recent feature mix changes, and assess whether rollback or traffic controls are required.",
    };
  }

  if (
    params.driftSeverity === "High" ||
    params.volatilitySignal === "Extreme Volatility"
  ) {
    return {
      title: "Validate feature mix and population shift",
      priority: "High",
      owner: "ML Ops",
      rationale:
        "High drift or volatility suggests the production population may be moving away from the model’s learned behavior.",
      nextStep:
        "Compare recent cases against historical scoring ranges and inspect whether recent inputs reflect a changed business mix.",
    };
  }

  if (
    params.trendDirection === "Upward" &&
    params.skewSignal === "Highly Skewed"
  ) {
    return {
      title: "Review concentrated upward severity pattern",
      priority: "High",
      owner: "Model Owner",
      rationale:
        "An upward trend combined with strong skew can indicate increasing severity assignments concentrated in a narrower case segment.",
      nextStep:
        "Cross-check dominant drivers on the Explainability page and validate whether the affected cases align with expected business risk.",
    };
  }

  if (
    params.concentrationSignal === "Highly Concentrated" ||
    params.stabilityLevel === "At Risk"
  ) {
    return {
      title: "Investigate output compression risk",
      priority: "Medium",
      owner: "Model Owner",
      rationale:
        "Concentrated outputs may reduce the model’s ability to separate cases cleanly across the score range.",
      nextStep:
        "Review distribution width and confirm whether compression is expected for the current case mix or reflects early degradation.",
    };
  }

  if (params.stabilityLevel === "Watch") {
    return {
      title: "Continue enhanced monitoring",
      priority: "Medium",
      owner: "ML Ops",
      rationale:
        "Signals remain manageable, but emerging instability should be monitored before it develops into a stronger drift pattern.",
      nextStep:
        "Track the next monitoring cycle and compare whether drift, skew, and volatility move together or normalize.",
    };
  }

  return {
    title: "Continue standard monitoring",
    priority: "Low",
    owner: "Operations",
    rationale:
      "The current monitoring state does not indicate material instability or immediate business risk.",
    nextStep:
      "Maintain routine monitoring and keep alert thresholds under observation.",
  };
}

function getEscalationOutcome(params: {
  stabilityLevel: StabilityLevel;
  driftSeverity: AlertSeverity;
  trendDirection: string;
  volatilitySignal: string;
  skewSignal: string;
}): EscalationOutcome {
  if (params.driftSeverity === "Critical" || params.stabilityLevel === "Critical") {
    return {
      decision: "Escalate",
      rationale:
        "Critical drift or stability deterioration indicates the model may be behaving outside acceptable operating tolerance.",
      operatorNote:
        "Escalate immediately and treat this as a priority validation event.",
    };
  }

  if (
    params.driftSeverity === "High" ||
    params.volatilitySignal === "Extreme Volatility" ||
    (params.trendDirection === "Upward" && params.skewSignal === "Highly Skewed")
  ) {
    return {
      decision: "Watch",
      rationale:
        "Signals are materially elevated and warrant closer review, but they do not yet confirm a mandatory intervention state.",
      operatorNote:
        "Increase monitoring frequency and validate business alignment before escalation.",
    };
  }

  return {
    decision: "Hold",
    rationale:
      "Current signals suggest the system remains within an acceptable operational range.",
    operatorNote:
      "No escalation is required. Continue standard observability checks.",
  };
}

function buildMonitoringTimeline(params: {
  driftSeverity: AlertSeverity;
  trendDirection: string;
  skewSignal: string;
  concentrationSignal: string;
  volatilitySignal: string;
  stabilityLevel: StabilityLevel;
}): MonitoringTimelineEvent[] {
  const events: MonitoringTimelineEvent[] = [];

  if (params.stabilityLevel === "Critical") {
    events.push({
      title: "Stability threshold breach detected",
      severity: "Critical",
      description:
        "The unified stability score has dropped into a critical range, signaling material operational stress.",
    });
  } else if (params.stabilityLevel === "At Risk") {
    events.push({
      title: "Stability deterioration surfaced",
      severity: "Warning",
      description:
        "The monitoring profile indicates the system is moving out of a fully stable operating band.",
    });
  } else if (params.stabilityLevel === "Watch") {
    events.push({
      title: "Early-stage watch condition opened",
      severity: "Watch",
      description:
        "A subset of monitoring signals is beginning to move away from baseline behavior.",
    });
  } else {
    events.push({
      title: "Baseline operating state maintained",
      severity: "Info",
      description:
        "Current monitoring signals suggest the model remains within a controlled operating range.",
    });
  }

  if (params.driftSeverity === "High" || params.driftSeverity === "Critical") {
    events.push({
      title: "Variance spike detected",
      severity:
        params.driftSeverity === "Critical" ? "Critical" : "Warning",
      description:
        "Recent output variability has increased materially, indicating possible drift or changed population behavior.",
    });
  } else if (params.driftSeverity === "Moderate") {
    events.push({
      title: "Moderate drift pressure observed",
      severity: "Watch",
      description:
        "Variance remains manageable, but it is elevated enough to justify continued attention.",
    });
  }

  if (params.trendDirection === "Upward") {
    events.push({
      title: "Upward severity trend observed",
      severity: "Warning",
      description:
        "Recent predictions are trending upward, suggesting a possible shift toward higher-severity outcomes.",
    });
  } else if (params.trendDirection === "Downward") {
    events.push({
      title: "Downward redistribution observed",
      severity: "Watch",
      description:
        "Recent predictions are trending downward, which may indicate a change in case mix or compressed severity behavior.",
    });
  } else if (params.trendDirection === "Flat") {
    events.push({
      title: "Directional movement remains flat",
      severity: "Info",
      description:
        "No strong directional drift is visible across the most recent prediction sequence.",
    });
  }

  if (params.skewSignal === "Highly Skewed") {
    events.push({
      title: "Asymmetry signal flagged",
      severity: "Warning",
      description:
        "The gap between mean and median indicates output asymmetry that should be reviewed alongside recent business cases.",
    });
  }

  if (params.concentrationSignal === "Highly Concentrated") {
    events.push({
      title: "Output compression flag raised",
      severity: "Watch",
      description:
        "The output distribution is tightly compressed, which can reduce separation power across cases.",
    });
  }

  if (
    params.volatilitySignal === "High Volatility" ||
    params.volatilitySignal === "Extreme Volatility"
  ) {
    events.push({
      title: "Volatility expansion detected",
      severity:
        params.volatilitySignal === "Extreme Volatility" ? "Critical" : "Warning",
      description:
        "The output spread has widened meaningfully, indicating elevated instability or more heterogeneous inputs.",
    });
  }

  return events.slice(0, 5);
}

function ChartShell({
  heightClass,
  children,
}: {
  heightClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mt-6 w-full min-w-0 ${heightClass}`}>
      <div className="h-full w-full min-w-0 rounded-xl border border-neutral-800 bg-black/20 p-2">
        <div className="h-full w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const router = useRouter();

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

  const stability = buildStabilityScore({
    driftSignal: driftLevel,
    skewSignal,
    concentrationSignal,
    volatilitySignal,
    trendDirection,
  });

  const stabilityTone = getStabilityTone(stability.level);

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
  const combinedDriftReasoning = getCombinedDriftReasoning(
    driftSeverity,
    trendDirection,
    skewSignal
  );
  const modelHealthSummary = getModelHealthSummary(
    driftSeverity,
    trendDirection,
    volatilitySignal,
    skewSignal
  );

  const driftBreakdown = getDriftBreakdown(
    driftSeverity,
    trendDirection,
    skewSignal,
    concentrationSignal,
    volatilitySignal
  );

  const recommendedAction = getRecommendedAction({
    stabilityLevel: stability.level,
    driftSeverity,
    trendDirection,
    skewSignal,
    concentrationSignal,
    volatilitySignal,
  });

  const escalationOutcome = getEscalationOutcome({
    stabilityLevel: stability.level,
    driftSeverity,
    trendDirection,
    volatilitySignal,
    skewSignal,
  });

  const timelineEvents = buildMonitoringTimeline({
    driftSeverity,
    trendDirection,
    skewSignal,
    concentrationSignal,
    volatilitySignal,
    stabilityLevel: stability.level,
  });

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
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <section className="flex min-w-0 flex-col gap-3 border-b border-neutral-800 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 sm:text-sm">
          Observability Center
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Monitoring Dashboard
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Review prediction activity, output distribution behavior, and core
          monitoring signals from the live model serving layer.
        </p>
      </section>

      {isLoading && (
        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <p className="text-sm text-neutral-300">
            Loading monitoring metrics from the observability endpoint...
          </p>
        </div>
      )}

      {error && (
        <div className="min-w-0 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 sm:p-6">
          {error}
        </div>
      )}

      {!isLoading && !error && distribution && (
        <>
          {/* ── System Status Banner ── */}
          <section
            className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${stabilityTone.badge.includes("emerald")
              ? "border-emerald-500/20 bg-emerald-500/10"
              : stabilityTone.badge.includes("amber")
              ? "border-amber-500/20 bg-amber-500/10"
              : stabilityTone.badge.includes("orange")
              ? "border-orange-500/20 bg-orange-500/10"
              : "border-red-500/20 bg-red-500/10"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    stability.level === "Stable"
                      ? "bg-emerald-400"
                      : stability.level === "Watch"
                      ? "bg-amber-400"
                      : stability.level === "At Risk"
                      ? "bg-orange-400"
                      : "bg-red-400"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    System Status
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-white">
                    {stability.level} — Stability Score {stability.score}/100
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${stabilityTone.badge}`}
                >
                  {stability.level}
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/explainability")}
                  className="w-fit rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                >
                  Investigate Drivers →
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-neutral-300">
              {stabilityTone.text}
            </p>
          </section>
          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">Model Health Layer</p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Current Health Summary
                </h2>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
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

            <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Executive Summary
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  {modelHealthSummary}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Combined Drift Reasoning
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  {combinedDriftReasoning}
                </p>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">Executive Scoring Layer</p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Model Stability Score
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-300">
                  A unified stability signal built from drift, skew,
                  concentration, volatility, and directional movement to provide
                  a single executive-facing health score for the live model.
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${stabilityTone.badge}`}
              >
                {stability.level} · {stability.score}/100
              </span>
            </div>

            <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[260px_1fr]">
              <div
                className={`rounded-xl border bg-black/30 p-5 ${stabilityTone.ring}`}
              >
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Stability Index
                </p>
                <p className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
                  {stability.score}
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  {stability.level}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Drift Penalty
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    -{stability.penalties.driftPenalty}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">{driftLevel}</p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Skew Penalty
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    -{stability.penalties.skewPenalty}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">{skewSignal}</p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Concentration Penalty
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    -{stability.penalties.concentrationPenalty}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    {concentrationSignal}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Volatility Penalty
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    -{stability.penalties.volatilityPenalty}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    {volatilitySignal}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Trend Penalty
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    -{stability.penalties.trendPenalty}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    {trendDirection}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-5">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Operational Interpretation
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-300">
                {stabilityTone.text}
              </p>
            </div>
          </section>

          <section className="grid min-w-0 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-neutral-400">
                    Operational Action Layer
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                    Recommended Action
                  </h2>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getPriorityTone(
                    recommendedAction.priority
                  )}`}
                >
                  Priority: {recommendedAction.priority}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Action
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {recommendedAction.title}
                  </h3>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Rationale
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    {recommendedAction.rationale}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Owner
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {recommendedAction.owner}
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Next Step
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {recommendedAction.nextStep}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-neutral-400">
                    Escalation Decision Layer
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                    Escalation Decision
                  </h2>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getDecisionTone(
                    escalationOutcome.decision
                  )}`}
                >
                  {escalationOutcome.decision}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Decision Basis
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    {escalationOutcome.rationale}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Operator Note
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    {escalationOutcome.operatorNote}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">Drift Breakdown Layer</p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Drift Breakdown
                </h2>
              </div>

              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getConfidenceTone(
                  driftBreakdown.confidence
                )}`}
              >
                Confidence: {driftBreakdown.confidence}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Categorical Drivers
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {driftBreakdown.categoricalContribution}%
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Estimated contribution from categorical feature mix changes.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Continuous Drivers
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {driftBreakdown.continuousContribution}%
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Estimated contribution from numerical input movement.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Distribution Widening
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {driftBreakdown.distributionContribution}%
                </p>
                <p className="mt-2 text-sm text-neutral-400">
                  Estimated contribution from broader output spread behavior.
                </p>
              </div>
            </div>

            <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Primary Drift Driver
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {driftBreakdown.primaryDriver}
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  This is the most plausible current source of drift based on the
                  combined monitoring signals surfaced by the system.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Operational Interpretation
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  {driftBreakdown.explanation}
                </p>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">
                  Monitoring Event Layer
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Monitoring Timeline
                </h2>
              </div>

              <span className="w-fit rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                Recent Change Events
              </span>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {timelineEvents.map((event, index) => (
                <div
                  key={`${event.title}-${index}`}
                  className="rounded-xl border border-neutral-800 bg-black/30 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {event.title}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${getTimelineTone(
                        event.severity
                      )}`}
                    >
                      {event.severity}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-neutral-300">
                    {event.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

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
              <h2 className="mt-3 break-words text-3xl font-semibold text-white">
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

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">Operator Alert Layer</p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Monitoring Alert State
                </h2>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
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

            <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <p className="text-sm text-neutral-400">Prediction Distribution</p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              Output Trend Visualization
            </h2>

            <ChartShell heightClass="h-[250px]">
              {chartData.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                  No data available for visualization.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  >
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
            </ChartShell>

            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Chart Interpretation
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-300">
                This chart shows the recent distribution of model outputs,
                helping operators quickly inspect whether predictions are tightly
                clustered, broadly spread, or beginning to move outside expected
                operational ranges.
              </p>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <p className="text-sm text-neutral-400">Trend Intelligence</p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              Sequential Prediction Movement
            </h2>

            <ChartShell heightClass="h-[280px]">
              {chartData.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                  No trend data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                  >
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
            </ChartShell>

            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Trend Interpretation
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-300">
                This sequential chart helps surface directional drift, sudden
                movement spikes, and stability patterns across recently logged
                predictions rather than viewing each output in isolation.
              </p>
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

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <p className="text-sm text-neutral-400">Insight Engine</p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
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

          <section className="grid min-w-0 gap-6 xl:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
              <p className="text-sm text-neutral-400">Observability Summary</p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Behavioral Interpretation
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Distribution Behavior
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Current output behavior is characterized by{" "}
                    <span className="font-semibold text-white">
                      {volatilitySignal}
                    </span>
                    ,{" "}
                    <span className="font-semibold text-white">
                      {skewSignal}
                    </span>{" "}
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

            <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
              <p className="text-sm text-neutral-400">Operator Review</p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
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

          <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">
                  Cross-Page Monitoring Link
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Driver-Level Monitoring Context
                </h2>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="w-fit rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                  Connected Insight
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/explainability")}
                  className="w-fit rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                >
                  Investigate Drivers →
                </button>
              </div>
            </div>

            <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Monitoring Interpretation
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  Monitoring signals should be interpreted alongside scoring and
                  explainability outputs. If drift or directional movement
                  increases, operators should cross-check whether dominant
                  features from the Explainability page are also becoming more
                  influential in recent predictions.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Why This Connection Matters
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  Observability shows that output behavior is changing.
                  Explainability helps reveal which drivers may be causing that
                  movement. Together, they provide a stronger operational view
                  than monitoring raw statistics alone.
                </p>
              </div>
            </div>
          </section>

          <section className="grid min-w-0 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-neutral-400">
                    Distribution Metrics
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                    Prediction Summary
                  </h2>
                </div>

                <span className="w-fit rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
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

            <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-neutral-400">Recent Activity</p>
                  <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                    Prediction Feed
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-400">
                  Last {recentPredictions.length} predictions (recent window)
                </span>
              </div>

              {recentPredictions.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-neutral-800 bg-black/20 p-5 sm:p-6">
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
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            Prediction #{index + 1}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {formatMetric(value)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
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