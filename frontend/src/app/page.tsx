"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";

type ModelInfo = {
  active_model_name?: string;
  active_run_id?: string;
  stage?: string;
  version?: string;
};

type DemoScenario = {
  id: string;
  title: string;
  badge: string;
  tone: string;
  description: string;
  cont1: number;
  cat1: string;
  cat71: string;
  cat89: string;
  cat116: string;
};

type WalkthroughStep = {
  id: string;
  stepLabel: string;
  title: string;
  description: string;
  observation: string;
  actionLabel: string;
  scenarioId: string;
};

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "baseline-stable",
    title: "Stable Baseline Claim",
    badge: "Stable",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    description:
      "Validated baseline scenario used to establish a controlled medium-severity starting point before counterfactual testing.",
    cont1: 15000,
    cat1: "A",
    cat71: "A",
    cat89: "A",
    cat116: "A",
  },
  {
    id: "dominant-driver",
    title: "Dominant Driver Shift",
    badge: "Sensitivity",
    tone: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    description:
      "Launch the validated baseline, then trigger a cat71 shift from A to B in scoring to demonstrate material model sensitivity.",
    cont1: 15000,
    cat1: "A",
    cat71: "A",
    cat89: "A",
    cat116: "A",
  },
  {
    id: "weak-driver",
    title: "Weak Driver Stability Test",
    badge: "Controlled",
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    description:
      "Start from the validated baseline and adjust weaker drivers such as cat89 or cat116 to demonstrate limited movement.",
    cont1: 15000,
    cat1: "A",
    cat71: "A",
    cat89: "A",
    cat116: "A",
  },
  {
    id: "stress-case",
    title: "Stress Escalation",
    badge: "Escalate",
    tone: "border-red-500/20 bg-red-500/10 text-red-300",
    description:
      "Start from the validated baseline and apply the guided stress simulation in scoring to demonstrate escalation.",
    cont1: 15000,
    cat1: "A",
    cat71: "A",
    cat89: "A",
    cat116: "A",
  },
];

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "baseline",
    stepLabel: "Step 1",
    title: "Establish a stable baseline",
    description:
      "Start from a balanced operational scenario to understand the model's normal decision posture before testing driver sensitivity.",
    observation:
      "The system establishes a stable baseline prediction with consistent decision outputs and a well-aligned operational recommendation.",
    actionLabel: "Launch baseline scenario",
    scenarioId: "baseline-stable",
  },
  {
    id: "weak-change",
    stepLabel: "Step 2",
    title: "Test a weak-feature adjustment",
    description:
      "Use the baseline scenario, then in scoring change a weak driver such as cat89 or cat116 and re-run the simulation.",
    observation:
      "The system demonstrates stability under weak feature perturbations, indicating controlled sensitivity and resistance to noise.",
    actionLabel: "Start from baseline for weak-driver test",
    scenarioId: "weak-driver",
  },
  {
    id: "dominant-shift",
    stepLabel: "Step 3",
    title: "Trigger the dominant-driver shift",
    description:
      "From the same baseline, use the dominant-driver simulation path so the system can surface a material response when cat71 is altered.",
    observation:
      "The system exhibits a dominant-driver response, producing a material shift in prediction, risk classification, and decision intensity.",
    actionLabel: "Launch dominant-driver story",
    scenarioId: "dominant-driver",
  },
  {
    id: "stress-case",
    stepLabel: "Step 4",
    title: "Observe escalation under stress",
    description:
      "Finish the walkthrough with a stronger stress scenario so the platform demonstrates behavior under a more severe operational condition.",
    observation:
      "The system transitions into a higher-risk operational state, demonstrating escalation behavior and decision pathway adjustment under stress conditions.",
    actionLabel: "Launch escalation scenario",
    scenarioId: "stress-case",
  },
];

export default function OverviewPage() {
  const router = useRouter();

  const [status, setStatus] = useState("loading");
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [activeWalkthroughStep, setActiveWalkthroughStep] = useState(
    WALKTHROUGH_STEPS[0].id
  );

  useEffect(() => {
    let isMounted = true;

    const fetchOverviewData = async () => {
      const healthController = new AbortController();
      const modelController = new AbortController();

      const healthTimeout = setTimeout(() => healthController.abort(), 8000);
      const modelTimeout = setTimeout(() => modelController.abort(), 8000);

      try {
        const healthRes = await fetch(`${API_BASE_URL}/health`, {
          signal: healthController.signal,
        });

        if (!healthRes.ok) {
          throw new Error("Health endpoint returned a non-OK response.");
        }

        const healthData = await healthRes.json();

        if (isMounted) {
          setStatus(healthData.status ?? "unknown");
        }
      } catch (error) {
        console.error("Overview health check failed:", error);

        if (isMounted) {
          setStatus("error");
        }
      } finally {
        clearTimeout(healthTimeout);
      }

      try {
        const modelRes = await fetch(`${API_BASE_URL}/model-info`, {
          signal: modelController.signal,
        });

        if (!modelRes.ok) {
          throw new Error("Model info endpoint returned a non-OK response.");
        }

        const modelData = await modelRes.json();

        if (isMounted) {
          setModelInfo(modelData);
        }
      } catch (error) {
        console.error("Overview model info fetch failed:", error);

        if (isMounted) {
          setModelInfo(null);
        }
      } finally {
        clearTimeout(modelTimeout);
      }
    };

    fetchOverviewData();

    return () => {
      isMounted = false;
    };
  }, []);

  const healthTone =
    status === "ok"
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : status === "loading"
      ? "text-yellow-300 border-yellow-500/30 bg-yellow-500/10"
      : status === "unknown"
      ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
      : "text-red-400 border-red-500/30 bg-red-500/10";

  const healthLabel =
    status === "ok"
      ? "Operational"
      : status === "loading"
      ? "Loading"
      : status === "unknown"
      ? "Unknown"
      : "Error";

  const activeStep = useMemo(
    () =>
      WALKTHROUGH_STEPS.find((step) => step.id === activeWalkthroughStep) ??
      WALKTHROUGH_STEPS[0],
    [activeWalkthroughStep]
  );

  const getScenarioById = (scenarioId: string) =>
    DEMO_SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? null;

  const handleScenarioLaunch = (scenario: DemoScenario) => {
    const params = new URLSearchParams({
      cont1: String(scenario.cont1),
      cat1: scenario.cat1,
      cat71: scenario.cat71,
      cat89: scenario.cat89,
      cat116: scenario.cat116,
      demoScenario: scenario.id,
    });

    router.push(`/scoring?${params.toString()}`);
  };

  const handleWalkthroughLaunch = (step: WalkthroughStep) => {
    const scenario = getScenarioById(step.scenarioId);
    if (!scenario) return;
    handleScenarioLaunch(scenario);
  };

  const walkthroughScenario = getScenarioById(activeStep.scenarioId);

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      {/* Hero / header section */}
      <section className="flex flex-col gap-4 border-b border-neutral-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 sm:text-sm">
            Enterprise ML Platform
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Claim Severity Intelligence Platform
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
            Production-style decision intelligence system for insurance claim
            severity prediction, explainability, monitoring, and model
            governance.
          </p>
        </div>

        <div
          className={`w-fit inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium ${healthTone}`}
        >
          Backend Status: {healthLabel}
        </div>
      </section>

      {/* Guided Product Walkthrough section */}
      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-cyan-500/20 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300 sm:text-sm">
              Guided Product Walkthrough
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Interactive decision intelligence sequence
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-100">
              This guided walkthrough demonstrates how the system behaves across
              baseline, stability, sensitivity, and escalation conditions within
              a controlled operational flow.
            </p>
          </div>

          <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200">
            Story Mode Enabled
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          {/* Walkthrough step selector cards */}
          <div className="space-y-3">
            {WALKTHROUGH_STEPS.map((step) => {
              const isActive = activeWalkthroughStep === step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveWalkthroughStep(step.id)}
                  className={`w-full min-w-0 rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? "border-cyan-400/30 bg-cyan-400/10"
                      : "border-neutral-800 bg-black/30 hover:border-neutral-700 hover:bg-black/40"
                  }`}
                >
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      isActive ? "text-cyan-300" : "text-neutral-500"
                    }`}
                  >
                    {step.stepLabel}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    {step.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active walkthrough detail panel */}
          <div className="min-w-0 rounded-2xl border border-neutral-800 bg-black/30 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-cyan-300">{activeStep.stepLabel}</p>
                <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  {activeStep.title}
                </h3>
              </div>

              <span className="w-fit rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-medium text-neutral-300">
                Guided execution flow
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  What this step does
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-200">
                  {activeStep.description}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Expected system behavior
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-200">
                  {activeStep.observation}
                </p>
              </div>

              {walkthroughScenario && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Starting scenario
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <span className="rounded-full border border-neutral-700 bg-black/30 px-3 py-1 text-xs font-medium text-white">
                      cont1: {walkthroughScenario.cont1}
                    </span>
                    <span className="rounded-full border border-neutral-700 bg-black/30 px-3 py-1 text-xs font-medium text-white">
                      cat1: {walkthroughScenario.cat1}
                    </span>
                    <span className="rounded-full border border-neutral-700 bg-black/30 px-3 py-1 text-xs font-medium text-white">
                      cat71: {walkthroughScenario.cat71}
                    </span>
                    <span className="rounded-full border border-neutral-700 bg-black/30 px-3 py-1 text-xs font-medium text-white">
                      cat89: {walkthroughScenario.cat89}
                    </span>
                    <span className="rounded-full border border-neutral-700 bg-black/30 px-3 py-1 text-xs font-medium text-white">
                      cat116: {walkthroughScenario.cat116}
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-300">
                  Execution note
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-100">
                  Each step launches from the same validated baseline. Once
                  inside scoring, use the guided simulation actions to run the
                  intended story — stability check, weak-driver test,
                  dominant-driver shift, or stress escalation.
                </p>
              </div>
            </div>

            {/* Walkthrough action buttons — stack on mobile, row on sm+ */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => handleWalkthroughLaunch(activeStep)}
                className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500"
              >
                {activeStep.actionLabel}
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveWalkthroughStep(
                    WALKTHROUGH_STEPS[
                      (WALKTHROUGH_STEPS.findIndex(
                        (step) => step.id === activeWalkthroughStep
                      ) +
                        1) %
                        WALKTHROUGH_STEPS.length
                    ].id
                  )
                }
                className="rounded-xl border border-neutral-700 bg-transparent px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
              >
                Next walkthrough step
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Predefined operational scenarios section */}
      <section className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 sm:text-sm">
              Scenario Launch Layer
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Guided operational entry points
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              Each card launches from the same validated baseline payload. The
              distinct behavior — stability check, dominant-driver shift,
              weak-driver test, or stress escalation — is demonstrated through
              the guided simulation actions inside the scoring workspace.
            </p>
          </div>

          <div className="w-fit rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300">
            Scenario Engine
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {DEMO_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => handleScenarioLaunch(scenario)}
              className="min-w-0 rounded-2xl border border-neutral-800 bg-black/30 p-4 text-left transition hover:border-neutral-700 hover:bg-black/40 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-white">
                    {scenario.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    {scenario.description}
                  </p>
                </div>

                <span
                  className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${scenario.tone}`}
                >
                  {scenario.badge}
                </span>
              </div>

              {/* Mini parameter cards — 2-col on mobile, 3-col on sm, 5-col on md+ */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    cont1
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {scenario.cont1}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    cat1
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {scenario.cat1}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    cat71
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {scenario.cat71}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    cat89
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {scenario.cat89}
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    cat116
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {scenario.cat116}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-neutral-400">
                  Launches the validated baseline into scoring — follow the guided actions to run the intended story.
                </p>
                <span className="text-sm font-semibold text-white">
                  Open Scoring →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* KPI summary cards — 1 col mobile, 2 tablet, 4 large */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">Platform Health</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {healthLabel}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Live backend connectivity and API readiness.
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">Active Stage</p>
          <h2 className="mt-3 break-words text-2xl font-semibold text-white">
            {modelInfo?.stage ?? "Unavailable"}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Current promoted lifecycle environment.
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">Registry Version</p>
          <h2 className="mt-3 break-words text-2xl font-semibold text-white">
            {modelInfo?.version || "Not surfaced"}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Latest active model version from registry metadata.
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">Explainability Layer</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Available</h2>
          <p className="mt-2 text-sm text-neutral-500">
            SHAP-based attribution is surfaced across the platform.
          </p>
        </div>
      </section>

      {/* Active model metadata + platform summary */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-neutral-400">Active Model</p>
              <h2 className="mt-1 break-words text-2xl font-semibold text-white">
                {modelInfo?.active_model_name ?? "Unavailable"}
              </h2>
            </div>

            <span className="w-fit rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
              Production Pointer
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Model Name
              </p>
              <p className="mt-2 break-words text-sm font-medium text-white">
                {modelInfo?.active_model_name ?? "Unavailable"}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Stage
              </p>
              <p className="mt-2 break-words text-sm font-medium text-white">
                {modelInfo?.stage ?? "Unavailable"}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Run ID
              </p>
              <p className="mt-2 break-all text-sm font-medium text-white">
                {modelInfo?.active_run_id ?? "Unavailable"}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Version
              </p>
              <p className="mt-2 break-words text-sm font-medium text-white">
                {modelInfo?.version || "Not surfaced by backend"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Overview Interpretation
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              This page acts as the platform entry layer, connecting live backend
              readiness, active model metadata, guided scenario execution, and
              downstream product flows across scoring, explainability, monitoring,
              and governance.
            </p>
          </div>
        </div>

        {/* Platform summary / operational capabilities */}
        <div className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <p className="text-sm text-neutral-400">Platform Summary</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Operational Capabilities
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-sm font-medium text-white">Prediction Serving</p>
              <p className="mt-1 text-sm text-neutral-400">
                Real-time scoring through production API endpoints.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-sm font-medium text-white">Explainability</p>
              <p className="mt-1 text-sm text-neutral-400">
                Feature-level SHAP outputs for model transparency.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-sm font-medium text-white">Monitoring</p>
              <p className="mt-1 text-sm text-neutral-400">
                Distribution checks, drift visibility, and model observability.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-sm font-medium text-white">Governance</p>
              <p className="mt-1 text-sm text-neutral-400">
                Registry integration, lifecycle awareness, and version control.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}