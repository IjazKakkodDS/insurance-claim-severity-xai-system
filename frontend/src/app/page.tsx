"use client";

import { useEffect, useState } from "react";
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

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "low-severity",
    title: "Low Severity Claim",
    badge: "Stable",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    description:
      "A lower-intensity scenario designed to show a contained severity outcome and a lighter operational recommendation.",
    cont1: 8,
    cat1: "A",
    cat71: "A",
    cat89: "B",
    cat116: "A",
  },
  {
    id: "medium-severity",
    title: "Medium Severity Claim",
    badge: "Balanced",
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    description:
      "A moderate scenario that should surface a more balanced decision profile and meaningful explainability output.",
    cont1: 35,
    cat1: "B",
    cat71: "B",
    cat89: "C",
    cat116: "B",
  },
  {
    id: "high-severity",
    title: "High Severity Claim",
    badge: "Escalate",
    tone: "border-red-500/20 bg-red-500/10 text-red-300",
    description:
      "A stronger-risk scenario intended to demonstrate elevated severity, more serious decision guidance, and stronger driver movement.",
    cont1: 82,
    cat1: "C",
    cat71: "D",
    cat89: "D",
    cat116: "C",
  },
  {
    id: "edge-case-shift",
    title: "Edge Case Shift",
    badge: "Stress Test",
    tone: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    description:
      "A scenario designed to surface behavior under sharper feature interactions and distribution shifts.",
    cont1: 58,
    cat1: "B",
    cat71: "D",
    cat89: "A",
    cat116: "D",
  },
];

export default function OverviewPage() {
  const router = useRouter();

  const [status, setStatus] = useState("loading");
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status ?? "unknown"))
      .catch(() => setStatus("error"));

    fetch(`${API_BASE_URL}/model-info`)
      .then((res) => res.json())
      .then((data) => setModelInfo(data))
      .catch(() => setModelInfo(null));
  }, []);

  const healthTone =
    status === "ok"
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : status === "loading"
      ? "text-yellow-300 border-yellow-500/30 bg-yellow-500/10"
      : "text-red-400 border-red-500/30 bg-red-500/10";

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-4 border-b border-neutral-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Enterprise ML Platform
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
            Claim Severity Intelligence Platform
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
            Production-style decision intelligence system for insurance claim
            severity prediction, explainability, monitoring, and model
            governance.
          </p>
        </div>

        <div
          className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium ${healthTone}`}
        >
          Backend Status: {status}
        </div>
      </section>

      {/* Guided Scenario Engine */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Scenario Intelligence Layer
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Predefined operational scenarios
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              This layer provides structured input configurations designed to surface
              distinct model behaviors, decision boundaries, and explainability patterns.
              Each scenario represents a controlled operational condition that can be
              used to observe how the system responds under different input distributions.
            </p>
          </div>

          <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300">
            Scenario Engine
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {DEMO_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => handleScenarioLaunch(scenario)}
              className="rounded-2xl border border-neutral-800 bg-black/30 p-5 text-left transition hover:border-neutral-700 hover:bg-black/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">
                    {scenario.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    {scenario.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${scenario.tone}`}
                >
                  {scenario.badge}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-5">
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

              <div className="mt-5 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3">
                <p className="text-sm text-neutral-400">
                  Route this scenario into the scoring workspace for evaluation.
                </p>
                <span className="text-sm font-semibold text-white">
                  Open Scoring →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">System Health</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{status}</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Live backend connectivity and API readiness.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">Active Stage</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {modelInfo?.stage ?? "Unavailable"}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Current promoted lifecycle environment.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">Registry Version</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {modelInfo?.version || "Not surfaced"}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Latest active model version from registry metadata.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
          <p className="text-sm text-neutral-400">Explainability</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Enabled</h2>
          <p className="mt-2 text-sm text-neutral-500">
            SHAP-based feature attribution is available.
          </p>
        </div>
      </section>

      {/* Main Detail Grid */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">Active Model</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                {modelInfo?.active_model_name ?? "Unavailable"}
              </h2>
            </div>

            <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
              Production Pointer
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Model Name
              </p>
              <p className="mt-2 text-sm font-medium text-white break-words">
                {modelInfo?.active_model_name ?? "Unavailable"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Stage
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {modelInfo?.stage ?? "Unavailable"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Run ID
              </p>
              <p className="mt-2 text-sm font-medium text-white break-all">
                {modelInfo?.active_run_id ?? "Unavailable"}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Version
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {modelInfo?.version || "Not surfaced by backend"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
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