
# Experience Flow

A guided, end-to-end walkthrough to experience the platform as intended.

This flow demonstrates how prediction, explainability, monitoring, and governance operate together as a single connected system. Not as isolated tools.

---

## Before You Begin

**Live platform:** [insurance-claim-severity-xai-system.vercel.app](https://insurance-claim-severity-xai-system.vercel.app/)

The backend is hosted on a free tier. The first request may take 30 to 60 seconds while the service cold-starts. Subsequent requests are fast.

This walkthrough takes approximately 2 to 3 minutes end to end.

---

## What You Will See

By the end of this flow you will have:

* launched a validated claim scenario from a controlled baseline
* generated a live severity prediction with risk classification and operational guidance
* triggered a dominant-driver shift and watched the model respond materially
* inspected the SHAP attribution explaining why the prediction changed
* reviewed the monitoring surface converting raw signals into an escalation decision
* examined the governance surface showing model lineage, version history, and audit traceability

Each step builds on the last. The system is designed to be walked through in sequence.

---

## Step 1. Enter from the Overview

Open the platform. You will land on the **Overview** page.

This page is the system entry point. It is not a landing page. It contains a guided walkthrough panel and a set of validated scenario cards, each pre-loaded with a specific input configuration.

**Action:** Select any scenario card. Click  **Open Scoring** .

**Observe:** The system routes you directly into the Scoring workspace with the scenario inputs already populated. No manual data entry required. The baseline is established.

---

## Step 2. Generate a Prediction

You are now on the **Scoring** page with inputs pre-filled from the selected scenario.

**Action:** Click  **Generate Prediction** .

**Observe:**

* A severity estimate is produced by the live XGBoost model
* A risk band classification appears: Low, Medium, or High
* An operational handling recommendation is surfaced below the prediction
* The driver sensitivity panel activates, identifying `cat71` as the dominant feature

This is the baseline decision output. Every subsequent step compares against this state.

---

## Step 3. Trigger the Dominant-Driver Shift

This is the most important interaction in the flow.

The scoring page contains guided simulation actions. These are not cosmetic controls. They are pre-built counterfactual scenarios designed to surface the model's sensitivity to its strongest driver.

**Action:** Click  **Trigger driver shift** . This flips `cat71` from its current value to its alternate. Then click  **Run Simulation** .

**Observe:**

* The predicted severity changes materially
* The risk band may shift classification entirely
* The delta panel quantifies the exact change in absolute and percentage terms
* The system labels this movement: Minor Shift, Significant Shift, or No Change
* The operational recommendation updates accordingly

A single feature changed. The system responded visibly. This is the dominant-driver sensitivity story the entire platform is built to surface.

---

## Step 4. Inspect the Explanation

Navigate to the **Explainability** page. The inputs carried forward from Scoring will pre-fill and the explanation will generate automatically.

The explainability layer runs SHAP attribution as a live API service. This is not a static chart. It is a per-request calculation against the production model.

**Observe (baseline explanation):**

* Every feature that influenced the prediction is ranked by absolute contribution
* Positive drivers are separated from negative drivers
* The dominant driver is called out explicitly with its contribution value and direction

**Action:** Run the counterfactual simulation on this page by adjusting `cat71` to the same alternate value used in Step 3. Click  **Run Simulation** .

**Observe (comparison):**

* The before-and-after SHAP profiles are displayed side by side
* The contribution delta chart shows which features moved and by how much
* Any feature that flipped directional sign is flagged separately
* The system narrates what changed and why it matters operationally

This confirms the mechanism behind the prediction shift observed in Step 3. The monitoring page will show whether this kind of movement is an isolated event or part of a broader pattern.

---

## Step 5. Read the Monitoring Surface

Navigate to the **Monitoring** page.

Most monitoring dashboards stop at charts and statistics. This one does not.

**Observe:**

* The **System Status Banner** at the top surfaces the current stability level: Stable, Watch, At Risk, or Critical
* The **Stability Score** is a single composite signal built from five dimensions: drift, skew, concentration, volatility, and trend direction
* Each dimension contributes a weighted penalty. The score reflects all of them together, not any single metric in isolation
* The **Escalation Decision** panel translates those signals into an operational outcome: Hold, Watch, or Escalate
* The **Recommended Action** panel specifies who should act, what they should do, and why

Below the decision layer, the distribution charts and prediction feed show the raw behavior underlying those signals.

**Key point:** The monitoring surface does not ask the operator to interpret raw statistics. It converts observability signals into decisions. That is the design intent.

---

## Step 6. Review the Governance Surface

Navigate to the **Governance** page.

**Observe:**

* The active model name, lifecycle stage, registry version, and run ID are surfaced directly
* The governance checklist shows the status of each control: registry metadata, lifecycle control surface, audit visibility, responsible AI documentation
* The version history and rollback history show the full promotion and recovery trail
* The model card section surfaces intended use, limitations, known risks, fairness considerations, and monitoring assumptions

No MLflow access is required to read any of this. The governance surface reads from file-based lifecycle artifacts, making the system's state auditable independently of its runtime infrastructure.

---

## What This Flow Demonstrates

Six steps. Five pages. One coherent system.

| Step | Surface        | What it proves                                                             |
| :--: | -------------- | -------------------------------------------------------------------------- |
|  1  | Overview       | The system initializes from a controlled, validated baseline               |
|  2  | Scoring        | Prediction is live, classified, and operationally framed                   |
|  3  | Scoring        | The model responds materially to its dominant driver                       |
|  4  | Explainability | The mechanism behind that response is transparent and auditable            |
|  5  | Monitoring     | Production behavior is converted into escalation decisions, not raw charts |
|  6  | Governance     | The model's lifecycle is traceable, versioned, and reviewable              |

The system is not six separate tools. It is one workflow. Each layer produces outputs that the next layer consumes. The prediction feeds monitoring. Monitoring feeds escalation. Explainability feeds governance review. Nothing operates in isolation.

---

## The One Interaction That Matters Most

If you have limited time, do Steps 2, 3, and 4 in sequence.

Generate a baseline prediction. Trigger the `cat71` driver shift. Open the explanation and compare before and after.

In those three steps, you will see a prediction change, understand exactly why it changed at the feature level, and have the evidence to act on it operationally. That end-to-end loop, from input to prediction to explanation to decision, is what the system is designed to deliver.

---

*Full technical documentation: [README.md](./README.md)*
*System overview: [SYSTEM_SNAPSHOT.md](./SYSTEM_SNAPSHOT.md)*
