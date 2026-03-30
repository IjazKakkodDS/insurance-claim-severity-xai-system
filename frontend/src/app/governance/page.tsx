"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

type ModelInfo = {
  active_model_name?: string;
  active_run_id?: string;
  stage?: string;
  version?: string;
};

type GovernanceStatus =
  | "Healthy"
  | "Under Review"
  | "Attention Required"
  | "Unknown";

type TimelineItem = {
  id: string;
  event: string;
  stage: string;
  version: string;
  actor: string;
  timestamp: string;
  status: string;
};

type AuditRow = {
  id: string;
  action: string;
  artifact: string;
  actor: string;
  timestamp: string;
  outcome: string;
};

function getGovernanceStatus(stage?: string): GovernanceStatus {
  if (!stage) return "Unknown";
  if (stage === "Production") return "Healthy";
  if (stage === "Staging") return "Under Review";
  return "Attention Required";
}

function getStatusTone(status: GovernanceStatus) {
  if (status === "Healthy") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "Under Review") {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (status === "Attention Required") {
    return "border border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border border-neutral-700 bg-neutral-800 text-neutral-300";
}

function getStageTone(stage?: string) {
  if (stage === "Production") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (stage === "Staging") {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border border-neutral-700 bg-neutral-800 text-neutral-300";
}

function getLifecycleNarrative(modelInfo: ModelInfo | null) {
  if (!modelInfo) {
    return "Governance interpretation becomes available once model registry metadata is loaded.";
  }

  if (modelInfo.stage === "Production") {
    return "The active model is currently linked to the production stage, indicating it is the primary decision-serving artifact exposed to downstream scoring workflows.";
  }

  if (modelInfo.stage === "Staging") {
    return "The active model is currently under staged review, which indicates controlled lifecycle progression prior to full production commitment.";
  }

  return "The current lifecycle stage requires closer governance review before the model can be treated as production-stable.";
}

function getResponsibleAiNarrative(stage?: string) {
  if (!stage) {
    return "Responsible AI interpretation is unavailable until lifecycle metadata is surfaced.";
  }

  if (stage === "Production") {
    return "Because this model supports a high-impact financial workflow, explainability, monitoring, rollback readiness, and documented usage boundaries should all be visible to operators and reviewers.";
  }

  return "The responsible AI layer should remain attached to the model even before production, ensuring that validation, limitations, and governance assumptions are already documented.";
}

export default function GovernancePage() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`${API_BASE_URL}/model-info`);

        if (!response.ok) {
          throw new Error("Failed to load governance metadata.");
        }

        const data = await response.json();
        setModelInfo(data);
      } catch (err) {
        console.error("Governance fetch error:", err);
        setError("Failed to load governance metadata.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchModelInfo();
  }, []);

  const governanceStatus = getGovernanceStatus(modelInfo?.stage);

  // Added: static readiness/history surfaces for premium governance UI
  const versionHistory = useMemo<TimelineItem[]>(
    () => [
      {
        id: "vh-1",
        event: "Current active pointer",
        stage: modelInfo?.stage ?? "Production",
        version: modelInfo?.version ?? "vCurrent",
        actor: "Registry System",
        timestamp: "Current",
        status: "Active",
      },
      {
        id: "vh-2",
        event: "Candidate promoted to evaluation",
        stage: "Staging",
        version: "vNext",
        actor: "ML Operator",
        timestamp: "Previous cycle",
        status: "Reviewed",
      },
      {
        id: "vh-3",
        event: "Prior production lineage",
        stage: "Production",
        version: "vPrevious",
        actor: "Release Workflow",
        timestamp: "Historical",
        status: "Archived",
      },
    ],
    [modelInfo]
  );

  const rollbackHistory = useMemo<TimelineItem[]>(
    () => [
      {
        id: "rb-1",
        event: "Rollback readiness checkpoint",
        stage: "Production",
        version: modelInfo?.version ?? "vCurrent",
        actor: "Governance Control",
        timestamp: "Current",
        status: "Ready",
      },
      {
        id: "rb-2",
        event: "Previous production pointer retained",
        stage: "Production",
        version: "vPrevious",
        actor: "Registry Backup",
        timestamp: "Historical",
        status: "Recoverable",
      },
    ],
    [modelInfo]
  );

  const auditRows = useMemo<AuditRow[]>(
    () => [
      {
        id: "au-1",
        action: "Model metadata fetched",
        artifact: modelInfo?.active_model_name ?? "Active model record",
        actor: "Governance UI",
        timestamp: "Current session",
        outcome: "Success",
      },
      {
        id: "au-2",
        action: "Lifecycle stage reviewed",
        artifact: modelInfo?.stage ?? "Lifecycle metadata",
        actor: "Operator",
        timestamp: "Review checkpoint",
        outcome: "Visible",
      },
      {
        id: "au-3",
        action: "Rollback path verified",
        artifact: "Production pointer history",
        actor: "Governance Control",
        timestamp: "Readiness check",
        outcome: "Prepared",
      },
      {
        id: "au-4",
        action: "Responsible AI summary surfaced",
        artifact: "Model card layer",
        actor: "Documentation Layer",
        timestamp: "Current session",
        outcome: "Available",
      },
    ],
    [modelInfo]
  );

  const lifecycleNarrative = getLifecycleNarrative(modelInfo);
  const responsibleAiNarrative = getResponsibleAiNarrative(modelInfo?.stage);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-3 border-b border-neutral-800 pb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Governance Center
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Model Governance
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-neutral-400">
          Review active model metadata, lifecycle controls, version visibility,
          and responsible AI governance signals for the deployed system.
        </p>
      </section>

      {/* Loading / Error */}
      {isLoading && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-300">
            Loading governance metadata from the active model registry endpoint...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Top KPI Row */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Active Model</p>
              <h2 className="mt-3 break-words text-2xl font-semibold text-white">
                {modelInfo?.active_model_name ?? "Unavailable"}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Current production-linked model artifact.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Lifecycle Stage</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {modelInfo?.stage ?? "Unavailable"}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Current deployment stage surfaced by backend metadata.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Registry Version</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {modelInfo?.version || "Not surfaced"}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Version visibility from the governance layer.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Responsible AI</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Documented
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Governance artifacts and policy-ready documentation exist.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Governance Status</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {governanceStatus}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Overall signal based on currently surfaced lifecycle metadata.
              </p>
            </div>
          </section>

          {/* Added: governance signal band */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Approval State</p>
              <div className="mt-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(
                    governanceStatus
                  )}`}
                >
                  {governanceStatus}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-500">
                High-level governance readout for the currently surfaced model state.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Lifecycle Readiness</p>
              <div className="mt-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getStageTone(
                    modelInfo?.stage
                  )}`}
                >
                  {modelInfo?.stage ?? "Unknown"}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-500">
                Surface-level readiness of the active model pointer in the release flow.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Rollback Path</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Ready
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Prior pointer restoration logic is expected in the governance design.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-sm text-neutral-400">Audit Visibility</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Prepared
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Operator-facing audit surfaces are now represented in the UI layer.
              </p>
            </div>
          </section>

          {/* Main Grid */}
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Metadata Panel */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-400">Registry Metadata</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Active Model Record
                  </h2>
                </div>

                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                  Governance Tracked
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Model Name
                  </p>
                  <p className="mt-2 break-words text-sm font-medium text-white">
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
                  <p className="mt-2 break-all text-sm font-medium text-white">
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

              <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Governance Interpretation
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  This panel represents the currently active model pointer and
                  the metadata that should be visible to downstream operators,
                  validators, and governance reviewers in a production ML system.
                </p>
              </div>

              {/* Added */}
              <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Lifecycle Narrative
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  {lifecycleNarrative}
                </p>
              </div>
            </div>

            {/* Lifecycle / Controls Panel */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-400">Lifecycle Controls</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">
                Governance Signals
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-sm font-medium text-white">
                    Promotion Workflow
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Production stage assignment and controlled model promotion
                    are supported in the backend lifecycle flow.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-sm font-medium text-white">
                    Rollback Readiness
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Rollback logic has been implemented to restore prior active
                    production pointers when needed.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-sm font-medium text-white">
                    Version Visibility
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Registry versioning is part of the lifecycle design, though
                    one metadata field may still need fuller backend surfacing.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-sm font-medium text-white">
                    Auditability
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    This interface is prepared to surface future audit logs,
                    version history, model cards, and governance reports.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Action Layer */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-400">Action Layer</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Operator Controls
                </h2>
              </div>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                UI Ready
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-green-500/20 bg-green-500/10 px-5 py-4 text-left transition hover:bg-green-500/15"
              >
                <p className="text-sm font-semibold text-green-300">
                  Promote Model
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Lifecycle action surface for controlled stage promotion.
                </p>
              </button>

              <button
                type="button"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-left transition hover:bg-red-500/15"
              >
                <p className="text-sm font-semibold text-red-300">
                  Rollback Model
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Recovery control for restoring prior production pointers.
                </p>
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Control Interpretation
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                These controls currently represent the operator-facing layer of a
                governed ML system and can later be wired to real promotion,
                rollback, and approval workflows.
              </p>
            </div>

            {/* Added */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Approval Workflow
                </p>
                <p className="mt-2 text-sm text-white">
                  Reviewer sign-off layer prepared
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Validation Gate
                </p>
                <p className="mt-2 text-sm text-white">
                  Pre-production review checkpoint assumed
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Registry Integrity
                </p>
                <p className="mt-2 text-sm text-white">
                  Pointer-based lifecycle trace visible
                </p>
              </div>
            </div>
          </section>

          {/* Added: Version and rollback history */}
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-400">Version History</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Lifecycle Timeline
                  </h2>
                </div>

                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                  History
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {versionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-800 bg-black/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.event}
                        </p>
                        <p className="mt-1 text-sm text-neutral-400">
                          {item.actor} • {item.timestamp}
                        </p>
                      </div>

                      <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="text-sm text-neutral-400">
                        Stage:{" "}
                        <span className="font-semibold text-white">
                          {item.stage}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-400">
                        Version:{" "}
                        <span className="font-semibold text-white">
                          {item.version}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-400">Rollback History</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Recovery Readiness
                  </h2>
                </div>

                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                  Recovery
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {rollbackHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-800 bg-black/30 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.event}
                        </p>
                        <p className="mt-1 text-sm text-neutral-400">
                          {item.actor} • {item.timestamp}
                        </p>
                      </div>

                      <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="text-sm text-neutral-400">
                        Stage:{" "}
                        <span className="font-semibold text-white">
                          {item.stage}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-400">
                        Version:{" "}
                        <span className="font-semibold text-white">
                          {item.version}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Responsible AI / Artifact Readiness */}
          <section className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-400">Responsible AI</p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Fairness & Risk Framing
              </h2>
              <p className="mt-4 text-sm leading-6 text-neutral-400">
                Responsible AI documentation should summarize intended use,
                limitations, risks, governance controls, and interpretability
                considerations for stakeholders.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-400">Model Card Readiness</p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Documentation Layer
              </h2>
              <p className="mt-4 text-sm leading-6 text-neutral-400">
                This space is designed to surface model cards, validation
                summaries, training assumptions, and deployment readiness notes.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-sm text-neutral-400">Future Integration</p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Audit & Version Timeline
              </h2>
              <p className="mt-4 text-sm leading-6 text-neutral-400">
                The next governance enhancement is to wire version history,
                rollback events, approval metadata, and artifact links directly
                into this page.
              </p>
            </div>
          </section>

          {/* Added: audit activity table */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-400">Audit Layer</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Audit Activity Table
                </h2>
              </div>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                Audit Ready
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Action
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Artifact
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Actor
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Timestamp
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row) => (
                    <tr key={row.id} className="rounded-xl bg-black/30">
                      <td className="rounded-l-xl border-y border-l border-neutral-800 px-4 py-4 text-sm text-white">
                        {row.action}
                      </td>
                      <td className="border-y border-neutral-800 px-4 py-4 text-sm text-neutral-300">
                        {row.artifact}
                      </td>
                      <td className="border-y border-neutral-800 px-4 py-4 text-sm text-neutral-300">
                        {row.actor}
                      </td>
                      <td className="border-y border-neutral-800 px-4 py-4 text-sm text-neutral-300">
                        {row.timestamp}
                      </td>
                      <td className="rounded-r-xl border-y border-r border-neutral-800 px-4 py-4 text-sm text-neutral-300">
                        {row.outcome}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Audit Interpretation
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                This table represents the operator-facing audit surface where
                model actions, metadata access, lifecycle decisions, and review
                checkpoints can be tracked in a governed ML deployment.
              </p>
            </div>
          </section>

          {/* Model Card Summary */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-neutral-400">Model Card</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Summary Snapshot
                </h2>
              </div>

              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                Responsible AI
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Intended Use
                </p>
                <p className="mt-2 text-sm text-white">
                  Claim severity prediction
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Risk Profile
                </p>
                <p className="mt-2 text-sm text-white">
                  High-impact financial workflow
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Monitoring
                </p>
                <p className="mt-2 text-sm text-white">
                  Distribution tracking enabled
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Explainability
                </p>
                <p className="mt-2 text-sm text-white">
                  SHAP attribution available
                </p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Key Limitation
                </p>
                <p className="mt-2 text-sm text-white">
                  Sensitive to feature distribution stability
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Card Interpretation
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                This summary condenses the most important operational and
                responsible-AI metadata that stakeholders would expect from a
                governed production ML system.
              </p>
            </div>

            {/* Added: fuller model card sections */}
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Intended Use
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    This model is intended to support insurance claim severity
                    estimation in a controlled decision-support workflow rather
                    than autonomous unsupervised actioning.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Limitations
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Model performance and output behavior may degrade when live
                    feature distributions move materially away from training-time
                    assumptions or when operational populations change.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Known Risks
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Key risks include silent drift, compressed or unstable output
                    distributions, over-reliance on top drivers, and misuse
                    outside the intended claim-scoring context.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Fairness Considerations
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Governance review should ensure that model usage, feature
                    selection, and downstream handling do not create unjustified
                    bias or inconsistent treatment across operational segments.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Monitoring Assumptions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Stable deployment assumes regular monitoring of output
                    variance, concentration, skew, trend movement, and explainability
                    behavior across recent scoring windows.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Retraining Guidance
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-300">
                    Retraining or model review should be considered when
                    monitoring signals deteriorate persistently, business case
                    mix shifts materially, or validation results no longer align
                    with operational expectations.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-800 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Responsible AI Narrative
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-300">
                {responsibleAiNarrative}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}