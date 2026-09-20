import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import "./ResultsEntryTab.css";
import {
  BACKEND_PENDING,
  getProjectSamples,
  saveLocalDraft,
  type ProjectSample,
} from "../../../../api/labResults";
import {
  defaultMethodData,
  evaluate,
  type Evaluation,
  type MethodData,
} from "./resultsEntryEngine";
import {
  HAS_PANEL,
  InputModes,
  MethodPanel,
  PipelineCards,
} from "./ResultsEntryPanels";

type TestType =
  | "PSD"
  | "PARTICLE_DENSITY"
  | "ATTERBERG"
  | "SHRINKAGE_LIMIT"
  | "TRIAXIAL_UU"
  | "CONSOLIDATION";

type AtterbergTab =
  | "liquid"
  | "plastic"
  | "flow"
  | "shrinkage";

type ConsolidationTab =
  | "load"
  | "time"
  | "elog"
  | "cv";

interface TestDefinition {
  id: TestType;
  label: string;
  ags: string;
}

const TESTS: TestDefinition[] = [
  {
    id: "PSD",
    label: "Grain size",
    ags: "GRAG",
  },
  {
    id: "PARTICLE_DENSITY",
    label: "Specific gravity",
    ags: "LPDN",
  },
  {
    id: "ATTERBERG",
    label: "Atterberg limits",
    ags: "LLPL",
  },
  {
    id: "SHRINKAGE_LIMIT",
    label: "Shrinkage limit",
    ags: "LSLT",
  },
  {
    id: "TRIAXIAL_UU",
    label: "Triaxial UU",
    ags: "TRIG",
  },
  {
    id: "CONSOLIDATION",
    label: "Consolidation",
    ags: "CONG",
  },
];

interface IdentityData {
  locationId: string;
  sampleId: string;
  specimenReference: string;
  specimenDepth: string;
  specimenBase: string;
  laboratory: string;
  technician: string;
  testDate: string;
}

// Identity starts empty. Every value here is entered by the user or
// copied from a real sample via the samples API - never pre-filled
// with mock values.
const INITIAL_IDENTITY: IdentityData = {
  locationId: "",
  sampleId: "",
  specimenReference: "",
  specimenDepth: "",
  specimenBase: "",
  laboratory: "",
  technician: "",
  testDate: "",
};

interface LiquidTrial {
  trial: number;
  blows: string;
  container: string;
  containerMass: string;
  wetContainer: string;
  dryContainer: string;
  waterContent: string;
  use: boolean;
}

// Trials start empty. Rows are added by the user while entering a real
// test - no seeded example readings.
const INITIAL_LIQUID_TRIALS: LiquidTrial[] = [];

interface PlasticTrial {
  trial: number;
  container: string;
  containerMass: string;
  wetContainer: string;
  dryContainer: string;
  waterContent: string;
}

const INITIAL_PLASTIC_TRIALS: PlasticTrial[] = [];

// Consolidation stages start empty. Stages are added by the user while
// entering a real test - no seeded example stages.
const CONSOLIDATION_STAGES: {
  stage: number;
  direction: string;
  stress: string;
  eStart: string;
  eEnd: string;
  mv: string;
  cvRoot: string;
  cvLog: string;
}[] = [];

export function ResultsEntryTab() {
  const [selectedTest, setSelectedTest] =
    useState<TestType>("PSD");

  const [identity, setIdentity] =
    useState<IdentityData>(INITIAL_IDENTITY);

  const [method, setMethod] =
    useState("IS 2720 Part 5 - Casagrande");

  const [preparation, setPreparation] =
    useState("Wet preparation");

  const [sieveSize, setSieveSize] =
    useState("0.425");

  const [passingSieve, setPassingSieve] =
    useState("98.0");

  const [atterbergTab, setAtterbergTab] =
    useState<AtterbergTab>("liquid");

  const [consolidationTab, setConsolidationTab] =
    useState<ConsolidationTab>("load");

  const [liquidTrials, setLiquidTrials] =
    useState<LiquidTrial[]>(INITIAL_LIQUID_TRIALS);

  const [plasticTrials, setPlasticTrials] =
    useState<PlasticTrial[]>(INITIAL_PLASTIC_TRIALS);

  const { projectId } = useParams();

  const [samples, setSamples] = useState<ProjectSample[]>([]);
  const [methodData, setMethodData] = useState<
    Partial<Record<TestType, MethodData>>
  >({});
  const [evaluation, setEvaluation] = useState<{
    snapshot: string;
    value: Evaluation;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(1);
  const [audit, setAudit] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) return;
    getProjectSamples(projectId)
      .then(setSamples)
      .catch(() => setSamples([]));
  }, [projectId]);

  const locationOptions = Array.from(
    new Set(samples.map((sample) => sample.loca_id))
  );
  const sampleOptions = samples.filter(
    (sample) => sample.loca_id === identity.locationId
  );

  function chooseLocation(locationId: string) {
    const first = samples.find((sample) => sample.loca_id === locationId);
    setIdentity((previous) => ({
      ...previous,
      locationId,
      sampleId: first ? first.sample_id : previous.sampleId,
      specimenDepth: first ? String(first.depth_from) : previous.specimenDepth,
      specimenBase:
        first && first.depth_to !== null ? String(first.depth_to) : previous.specimenBase,
    }));
  }

  function chooseSample(sampleId: string) {
    const found = samples.find((sample) => sample.sample_id === sampleId);
    setIdentity((previous) => ({
      ...previous,
      sampleId,
      specimenDepth: found ? String(found.depth_from) : previous.specimenDepth,
      specimenBase:
        found && found.depth_to !== null ? String(found.depth_to) : previous.specimenBase,
    }));
  }

  const currentData: MethodData =
    selectedTest === "ATTERBERG"
      ? {
          params: {},
          rows: liquidTrials.map((trial) => ({
            blows: trial.blows,
            containerMass: trial.containerMass,
            wetContainer: trial.wetContainer,
            dryContainer: trial.dryContainer,
            use: String(trial.use),
          })),
          rows2: plasticTrials.map((trial) => ({
            containerMass: trial.containerMass,
            wetContainer: trial.wetContainer,
            dryContainer: trial.dryContainer,
          })),
        }
      : methodData[selectedTest] ?? defaultMethodData(selectedTest);

  const snapshot = useMemo(
    () => selectedTest + JSON.stringify(currentData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTest, methodData, liquidTrials, plasticTrials]
  );
  const stale = evaluation !== null && evaluation.snapshot !== snapshot;
  const calculated = evaluation !== null && !stale;

  const currentTest = TESTS.find(
    (test) => test.id === selectedTest
  );

  function updateIdentity(
    field: keyof IdentityData,
    value: string
  ) {
    setIdentity((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleTestChange(test: TestType) {
    setSelectedTest(test);

    if (test === "ATTERBERG") {
      setMethod("IS 2720 Part 5 - Casagrande");
    } else if (test === "CONSOLIDATION") {
      setMethod("IS 2720 Part 15 - Oedometer");
    } else {
      setMethod("");
    }
  }

  function updateLiquidTrial(
    trialNumber: number,
    field: keyof LiquidTrial,
    value: string | boolean
  ) {
    setLiquidTrials((previous) =>
      previous.map((trial) =>
        trial.trial === trialNumber
          ? {
              ...trial,
              [field]: value,
            }
          : trial
      )
    );
  }

  function updatePlasticTrial(
    trialNumber: number,
    field: keyof PlasticTrial,
    value: string
  ) {
    setPlasticTrials((previous) =>
      previous.map((trial) =>
        trial.trial === trialNumber
          ? {
              ...trial,
              [field]: value,
            }
          : trial
      )
    );
  }

  function runEvaluation() {
    const value = evaluate(selectedTest, currentData);
    setEvaluation({ snapshot, value });
    return value;
  }

  function logAudit(entry: string) {
    setAudit((previous) => [
      `${new Date().toLocaleTimeString()} · rev ${revision} · ${entry}`,
      ...previous,
    ]);
  }

  function handleSaveDraft() {
    if (!projectId) {
      setNotice("No project in context: draft not saved.");
      return;
    }
    try {
      saveLocalDraft(
        projectId,
        selectedTest,
        { identity, method, preparation, sieveSize, passingSieve, data: currentData },
        revision
      );
      setNotice(
        "Draft saved in THIS BROWSER only. It was not saved to the server " +
          "(no results endpoint exists yet)."
      );
      logAudit("draft saved locally (browser)");
    } catch {
      setNotice("Draft could not be saved (browser storage unavailable).");
    }
  }

  function handleCalculate() {
    const value = runEvaluation();
    const errors = value.issues.filter((issue) => issue.level === "error").length;
    setNotice(
      errors
        ? `Calculated with ${errors} blocking error(s).`
        : "Calculated and validated."
    );
    logAudit("calculated/validated");
  }

  function handleSubmit() {
    const value = runEvaluation();
    const errors = value.issues.filter((issue) => issue.level === "error").length;
    setNotice(
      errors
        ? `Cannot submit: ${errors} blocking error(s) — see Validation.`
        : "Validation passed, but NOT submitted: the backend has no submit-for-check endpoint yet. Pending: " +
            BACKEND_PENDING.join("; ") + "."
    );
  }

  return (
    <div className="results-entry">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="results-entry-header">

        <div className="results-entry-header-left">

          <div className="results-entry-eyebrow">
            LABORATORY WORKBENCH
          </div>

          <h1 className="results-entry-title">
            Results Entry
          </h1>

          <p className="results-entry-description">
            The common header stays identical for every
            method. Test-specific raw readings,
            calculations, validation and AGS mapping are
            driven by the selected method definition.
          </p>

        </div>

        <div className="results-entry-actions">

          <button
            type="button"
            onClick={handleSaveDraft}
          >
            Save draft
          </button>

          <button
            type="button"
            onClick={handleCalculate}
          >
            Calculate and validate
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={handleSubmit}
          >
            Submit for check
          </button>

        </div>

      </div>

      {/* =====================================================
          WORKFLOW
          ===================================================== */}

      <div className="results-workflow">

        <WorkflowItem
          number="1"
          label="Identity"
          active={!calculated}
        />

        <WorkflowItem
          number="2"
          label="Method"
          active={!calculated}
        />

        <WorkflowItem
          number="3"
          label="Readings"
          active={!calculated}
        />

        <WorkflowItem
          number="4"
          label="Calculation"
          active={calculated}
        />

        <WorkflowItem
          number="5"
          label="QA"
        />

        <WorkflowItem
          number="6"
          label="Release"
        />

      </div>

      {/* =====================================================
          MAIN LAYOUT
          ===================================================== */}

      <div className="results-entry-layout">

        {/* ===================================================
            TEST CATALOG
            =================================================== */}

        <aside className="test-catalog">


          {TESTS.map((test) => {

            const active =
              selectedTest === test.id;

            return (
              <button
                key={test.id}
                type="button"
                className={
                  active
                    ? "test-catalog-row active"
                    : "test-catalog-row"
                }
                onClick={() =>
                  handleTestChange(test.id)
                }
              >

                <span>
                  {test.label}
                </span>

                <span className="catalog-ags">
                  {test.ags}
                </span>

              </button>
            );
          })}

        </aside>

        {/* ===================================================
            RIGHT CONTENT
            =================================================== */}

        <main className="results-main">

          <InputModes />

          {/* =================================================
              COMMON IDENTITY
              ================================================= */}

          <section className="results-card">

            <div className="results-card-header">

              <div>
                <h2>
                  Common test identity
                </h2>
              </div>

              <div className="revision-badge">
                Draft · Revision {revision}
              </div>

            </div>

            <div className="identity-grid">

              <Field label="Location ID">

                <select
                  value={identity.locationId}
                  onChange={(event) =>
                    chooseLocation(event.target.value)
                  }
                >
                  {(locationOptions.length
                    ? locationOptions
                    : ["BH-07", "BH-01", "BH-02", "BH-03"]
                  ).map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>

              </Field>

              <Field label="Sample ID">

                <select
                  value={identity.sampleId}
                  onChange={(event) =>
                    chooseSample(event.target.value)
                  }
                >
                  {(locationOptions.length
                    ? sampleOptions.map((sample) => sample.sample_id)
                    : ["BH07-UD-0800", "BH07-UD-0600"]
                  ).map((id) => (
                    <option key={id}>{id}</option>
                  ))}
                </select>

              </Field>

              <Field label="Specimen reference">

                <input
                  value={identity.specimenReference}
                  onChange={(event) =>
                    updateIdentity(
                      "specimenReference",
                      event.target.value
                    )
                  }
                />

              </Field>

              <Field label="Specimen depth (m)">

                <input
                  value={identity.specimenDepth}
                  onChange={(event) =>
                    updateIdentity(
                      "specimenDepth",
                      event.target.value
                    )
                  }
                />

              </Field>

              <Field label="Specimen base (m)">

                <input
                  value={identity.specimenBase}
                  onChange={(event) =>
                    updateIdentity(
                      "specimenBase",
                      event.target.value
                    )
                  }
                />

              </Field>

              <Field label="Laboratory">

                <select
                  value={identity.laboratory}
                  onChange={(event) =>
                    updateIdentity(
                      "laboratory",
                      event.target.value
                    )
                  }
                >

                  <option>
                    TDAC Central Laboratory
                  </option>

                  <option>
                    External Laboratory
                  </option>

                </select>

              </Field>

              <Field label="Technician">

                <select
                  value={identity.technician}
                  onChange={(event) =>
                    updateIdentity(
                      "technician",
                      event.target.value
                    )
                  }
                >

                  <option>
                    Laboratory Technician
                  </option>

                  <option>
                    Senior Laboratory Technician
                  </option>

                </select>

              </Field>

              <Field label="Test date">

                <input
                  type="date"
                  value={identity.testDate}
                  onChange={(event) =>
                    updateIdentity(
                      "testDate",
                      event.target.value
                    )
                  }
                />

              </Field>

            </div>

          </section>

          {/* =================================================
              TEST SPECIFIC
              ================================================= */}

          {selectedTest === "ATTERBERG" && (

            <AtterbergSection
              method={method}
              preparation={preparation}
              sieveSize={sieveSize}
              passingSieve={passingSieve}
              atterbergTab={atterbergTab}
              setMethod={setMethod}
              setPreparation={setPreparation}
              setSieveSize={setSieveSize}
              setPassingSieve={setPassingSieve}
              setAtterbergTab={setAtterbergTab}
              liquidTrials={liquidTrials}
              plasticTrials={plasticTrials}
              updateLiquidTrial={updateLiquidTrial}
              updatePlasticTrial={updatePlasticTrial}
            />

          )}

          {selectedTest === "CONSOLIDATION" && (

            <ConsolidationSection
              method={method}
              setMethod={setMethod}
              consolidationTab={consolidationTab}
              setConsolidationTab={
                setConsolidationTab
              }
            />

          )}

          {HAS_PANEL.includes(selectedTest) && (
              <MethodPanel
                test={selectedTest}
                data={currentData}
                onChange={(next) =>
                  setMethodData((previous) => ({
                    ...previous,
                    [selectedTest]: next,
                  }))
                }
              />
            )}

          <PipelineCards
            test={selectedTest}
            evaluation={evaluation ? evaluation.value : null}
            stale={stale}
            notice={notice}
          />

          {audit.length > 0 && (
            <section className="results-card">
              <div className="results-card-header">
                <h2>Audit trail (this session, local only)</h2>
              </div>
              {audit.map((entry, index) => (
                <div className="re-muted" key={index}>{entry}</div>
              ))}
            </section>
          )}

        </main>

      </div>

    </div>
  );
}

/* ============================================================
   ATTERBERG
   ============================================================ */

interface AtterbergProps {
  method: string;
  preparation: string;
  sieveSize: string;
  passingSieve: string;
  atterbergTab: AtterbergTab;

  setMethod: (value: string) => void;
  setPreparation: (value: string) => void;
  setSieveSize: (value: string) => void;
  setPassingSieve: (value: string) => void;
  setAtterbergTab: (value: AtterbergTab) => void;

  liquidTrials: LiquidTrial[];
  plasticTrials: PlasticTrial[];

  updateLiquidTrial: (
    trial: number,
    field: keyof LiquidTrial,
    value: string | boolean
  ) => void;

  updatePlasticTrial: (
    trial: number,
    field: keyof PlasticTrial,
    value: string
  ) => void;
}

function AtterbergSection({
  method,
  preparation,
  sieveSize,
  passingSieve,
  atterbergTab,
  setMethod,
  setPreparation,
  setSieveSize,
  setPassingSieve,
  setAtterbergTab,
  liquidTrials,
  plasticTrials,
  updateLiquidTrial,
  updatePlasticTrial,
}: AtterbergProps) {

  return (
    <section className="results-card">

      <div className="results-card-header">

        <h2>
          Liquid and plastic limits
        </h2>

        <span className="ags-label">
          AGS&nbsp;&nbsp;LLPL
        </span>

      </div>

      <div className="method-grid">

        <Field label="Method profile">

          <select
            value={method}
            onChange={(event) =>
              setMethod(event.target.value)
            }
          >

            <option>
              IS 2720 Part 5 - Casagrande
            </option>

            <option>
              BS 1377 Part 2
            </option>

          </select>

        </Field>

        <Field label="Preparation">

          <select
            value={preparation}
            onChange={(event) =>
              setPreparation(event.target.value)
            }
          >

            <option>
              Wet preparation
            </option>

            <option>
              Dry preparation
            </option>

          </select>

        </Field>

        <Field label="Sieve size (mm)">

          <input
            value={sieveSize}
            onChange={(event) =>
              setSieveSize(event.target.value)
            }
          />

        </Field>

        <Field label="Passing sieve (%)">

          <input
            value={passingSieve}
            onChange={(event) =>
              setPassingSieve(event.target.value)
            }
          />

        </Field>

      </div>

      <div className="subtabs">

        <button
          type="button"
          className={
            atterbergTab === "liquid"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setAtterbergTab("liquid")
          }
        >
          Liquid limit trials
        </button>

        <button
          type="button"
          className={
            atterbergTab === "plastic"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setAtterbergTab("plastic")
          }
        >
          Plastic limit trials
        </button>

        <button
          type="button"
          className={
            atterbergTab === "flow"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setAtterbergTab("flow")
          }
        >
          Flow curve
        </button>

        <button
          type="button"
          className={
            atterbergTab === "shrinkage"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setAtterbergTab("shrinkage")
          }
        >
          Shrinkage
        </button>

      </div>

      {atterbergTab === "liquid" && (

        <LiquidLimitTable
          trials={liquidTrials}
          updateTrial={updateLiquidTrial}
        />

      )}

      {atterbergTab === "plastic" && (

        <PlasticLimitTable
          trials={plasticTrials}
          updateTrial={updatePlasticTrial}
        />

      )}

      {atterbergTab === "flow" && (
        <AtterbergFlowCurve />
      )}

      {atterbergTab === "shrinkage" && (
        <ShrinkagePanel />
      )}

      {(atterbergTab === "liquid" ||
        atterbergTab === "plastic" ||
        atterbergTab === "flow") && (

        <div className="atterberg-bottom">

          <AtterbergFlowCurve />

          <ReportedValues />

        </div>

      )}

    </section>
  );
}

/* ============================================================
   LIQUID LIMIT
   ============================================================ */

function LiquidLimitTable({
  trials,
  updateTrial,
}: {
  trials: LiquidTrial[];

  updateTrial: (
    trial: number,
    field: keyof LiquidTrial,
    value: string | boolean
  ) => void;
}) {

  return (
    <div className="table-wrapper">

      <table className="results-table">

        <thead>

          <tr>
            <th>Trial</th>
            <th>Blows</th>
            <th>Container</th>
            <th>Container (g)</th>
            <th>Wet + container (g)</th>
            <th>Dry + container (g)</th>
            <th>Water content (%)</th>
            <th>Use</th>
          </tr>

        </thead>

        <tbody>

          {trials.map((trial) => (

            <tr key={trial.trial}>

              <td>
                {trial.trial}
              </td>

              <td>

                <input
                  value={trial.blows}
                  onChange={(event) =>
                    updateTrial(
                      trial.trial,
                      "blows",
                      event.target.value
                    )
                  }
                />

              </td>

              <td className="container-cell">
                {trial.container}
              </td>

              <td>

                <input
                  value={trial.containerMass}
                  onChange={(event) =>
                    updateTrial(
                      trial.trial,
                      "containerMass",
                      event.target.value
                    )
                  }
                />

              </td>

              <td>

                <input
                  value={trial.wetContainer}
                  onChange={(event) =>
                    updateTrial(
                      trial.trial,
                      "wetContainer",
                      event.target.value
                    )
                  }
                />

              </td>

              <td>

                <input
                  value={trial.dryContainer}
                  onChange={(event) =>
                    updateTrial(
                      trial.trial,
                      "dryContainer",
                      event.target.value
                    )
                  }
                />

              </td>

              <td className="calculated-cell">
                {trial.waterContent}
              </td>

              <td>

                <button
                  type="button"
                  className={
                    trial.use
                      ? "use-button active"
                      : "use-button"
                  }
                  onClick={() =>
                    updateTrial(
                      trial.trial,
                      "use",
                      !trial.use
                    )
                  }
                >
                  {trial.use ? "Yes" : "No"}
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

/* ============================================================
   PLASTIC LIMIT
   ============================================================ */

function PlasticLimitTable({
  trials,
  updateTrial,
}: {
  trials: PlasticTrial[];

  updateTrial: (
    trial: number,
    field: keyof PlasticTrial,
    value: string
  ) => void;
}) {

  return (
    <div className="table-wrapper">

      <table className="results-table">

        <thead>

          <tr>
            <th>Trial</th>
            <th>Container</th>
            <th>Container (g)</th>
            <th>Wet + container (g)</th>
            <th>Dry + container (g)</th>
            <th>Water content (%)</th>
          </tr>

        </thead>

        <tbody>

          {trials.map((trial) => (

            <tr key={trial.trial}>

              <td>
                {trial.trial}
              </td>

              <td className="container-cell">
                {trial.container}
              </td>

              <td>

                <input
                  value={trial.containerMass}
                  onChange={(event) =>
                    updateTrial(
                      trial.trial,
                      "containerMass",
                      event.target.value
                    )
                  }
                />

              </td>

              <td>

                <input
                  value={trial.wetContainer}
                  onChange={(event) =>
                    updateTrial(
                      trial.trial,
                      "wetContainer",
                      event.target.value
                    )
                  }
                />

              </td>

              <td>

                <input
                  value={trial.dryContainer}
                  onChange={(event) =>
                    updateTrial(
                      trial.trial,
                      "dryContainer",
                      event.target.value
                    )
                  }
                />

              </td>

              <td className="calculated-cell">
                {trial.waterContent}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

/* ============================================================
   FLOW CURVE
   ============================================================ */

function AtterbergFlowCurve() {

  return (
    <div className="flow-curve-card">

      <h3>
        Flow curve
      </h3>

      <div className="flow-chart">

        <div className="chart-y-label">
          Water content %
        </div>

        <svg
          viewBox="0 0 600 300"
          className="flow-svg"
          role="img"
          aria-label="Atterberg flow curve"
        >

          <line
            x1="70"
            y1="40"
            x2="70"
            y2="260"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="260"
            x2="560"
            y2="260"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="95"
            x2="560"
            y2="95"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="150"
            x2="560"
            y2="150"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="205"
            x2="560"
            y2="205"
            className="chart-grid"
          />

          <line
            x1="180"
            y1="40"
            x2="180"
            y2="260"
            className="chart-grid"
          />

          <line
            x1="300"
            y1="40"
            x2="300"
            y2="260"
            className="chart-grid"
          />

          <line
            x1="420"
            y1="40"
            x2="420"
            y2="260"
            className="chart-grid"
          />

          <line
            x1="125"
            y1="80"
            x2="510"
            y2="235"
            className="flow-line"
          />

          <circle
            cx="180"
            cy="95"
            r="6"
            className="flow-point"
          />

          <circle
            cx="350"
            cy="150"
            r="6"
            className="flow-point"
          />

          <circle
            cx="470"
            cy="205"
            r="6"
            className="flow-point"
          />

          <line
            x1="370"
            y1="40"
            x2="370"
            y2="260"
            className="blow-line"
          />

          <text
            x="380"
            y="55"
            className="chart-label"
          >
            25 blows
          </text>

        </svg>

        <div className="chart-x-label">
          Blows (log scale)
        </div>

      </div>

    </div>
  );
}

/* ============================================================
   REPORTED VALUES
   ============================================================ */

function ReportedValues() {

  return (
    <div className="reported-card">

      <h3>
        Reported values
      </h3>

      <ReportedRow
        label="Liquid limit"
        value="52%"
      />

      <ReportedRow
        label="Plastic limit"
        value="24%"
      />

      <ReportedRow
        label="Plasticity index"
        value="28"
      />

      <ReportedRow
        label="Flow index"
        value="11.8"
      />

      <ReportedRow
        label="Classification aid"
        value="CH"
      />

      <div className="classification-note">
        Classification is an interpretation aid.
        It must not overwrite the factual LL, PL or
        PI results.
      </div>

    </div>
  );
}

function ReportedRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="reported-row">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

/* ============================================================
   SHRINKAGE
   ============================================================ */

function ShrinkagePanel() {

  return (
    <div className="simple-method-panel">

      <h3>
        Shrinkage
      </h3>

      <div className="identity-grid">

        <Field label="Method profile">

          <select defaultValue="IS 2720 Part 6">

            <option>
              IS 2720 Part 6
            </option>

          </select>

        </Field>

        <Field label="Initial wet mass (g)">
          <input defaultValue="50.00" />
        </Field>

        <Field label="Dry mass (g)">
          <input defaultValue="34.50" />
        </Field>

        <Field label="Final volume (cm³)">
          <input defaultValue="18.20" />
        </Field>

      </div>

    </div>
  );
}

/* ============================================================
   CONSOLIDATION
   ============================================================ */

interface ConsolidationProps {
  method: string;
  setMethod: (value: string) => void;
  consolidationTab: ConsolidationTab;
  setConsolidationTab: (
    value: ConsolidationTab
  ) => void;
}

function ConsolidationSection({
  method,
  setMethod,
  consolidationTab,
  setConsolidationTab,
}: ConsolidationProps) {

  return (
    <section className="results-card">

      <div className="results-card-header">

        <h2>
          One-dimensional consolidation
        </h2>

        <span className="ags-label">
          AGS&nbsp;&nbsp;CONG + CONS
        </span>

      </div>

      <div className="consolidation-input-grid">

        <Field label="Method profile">

          <select
            value={method}
            onChange={(event) =>
              setMethod(event.target.value)
            }
          >

            <option>
              IS 2720 Part 15 - Oedometer
            </option>

            <option>
              BS 1377 Part 5
            </option>

          </select>

        </Field>

        <Field label="Diameter (mm)">
          <input defaultValue="75.00" />
        </Field>

        <Field label="Initial height (mm)">
          <input defaultValue="20.00" />
        </Field>

        <Field label="Initial void ratio">
          <input defaultValue="1.120" />
        </Field>

        <Field label="Initial water content (%)">
          <input defaultValue="42.5" />
        </Field>

        <Field label="Initial bulk density (Mg/m³)">
          <input defaultValue="1.72" />
        </Field>

        <Field label="Particle density (Mg/m³)">
          <input defaultValue="2.65" />
        </Field>

        <Field label="Temperature (C)">
          <input defaultValue="26.0" />
        </Field>

      </div>

      <div className="subtabs consolidation-tabs">

        <button
          type="button"
          className={
            consolidationTab === "load"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setConsolidationTab("load")
          }
        >
          Load stages
        </button>

        <button
          type="button"
          className={
            consolidationTab === "time"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setConsolidationTab("time")
          }
        >
          Time readings
        </button>

        <button
          type="button"
          className={
            consolidationTab === "elog"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setConsolidationTab("elog")
          }
        >
          e-log stress
        </button>

        <button
          type="button"
          className={
            consolidationTab === "cv"
              ? "subtab active"
              : "subtab"
          }
          onClick={() =>
            setConsolidationTab("cv")
          }
        >
          Cv plots
        </button>

      </div>

      {consolidationTab === "load" && (
        <ConsolidationLoadStages />
      )}

      {consolidationTab === "time" && (
        <ConsolidationTimeReadings />
      )}

      {consolidationTab === "elog" && (
        <ElogStress />
      )}

      {consolidationTab === "cv" && (
        <CvPlots />
      )}

    </section>
  );
}

/* ============================================================
   CONSOLIDATION LOAD STAGES
   ============================================================ */

function ConsolidationLoadStages() {

  return (
    <div className="table-wrapper">

      <table className="results-table consolidation-table">

        <thead>

          <tr>
            <th>Stage</th>
            <th>Direction</th>
            <th>Stress end (kPa)</th>
            <th>e start</th>
            <th>e end</th>
            <th>mv (m²/MN)</th>
            <th>Cv root (m²/yr)</th>
            <th>Cv log (m²/yr)</th>
          </tr>

        </thead>

        <tbody>

          {CONSOLIDATION_STAGES.map(
            (stage) => (

              <tr key={stage.stage}>

                <td>
                  {stage.stage}
                </td>

                <td>
                  {stage.direction}
                </td>

                <td>

                  <input
                    defaultValue={stage.stress}
                  />

                </td>

                <td>
                  {stage.eStart}
                </td>

                <td>
                  {stage.eEnd}
                </td>

                <td>
                  {stage.mv}
                </td>

                <td>
                  {stage.cvRoot}
                </td>

                <td>
                  {stage.cvLog}
                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

    </div>
  );
}

/* ============================================================
   CONSOLIDATION TIME READINGS
   ============================================================ */

function ConsolidationTimeReadings() {

  return (
    <div className="table-wrapper">

      <table className="results-table">

        <thead>

          <tr>
            <th>Stage</th>
            <th>Elapsed time</th>
            <th>Dial reading</th>
            <th>Settlement</th>
            <th>Comment</th>
          </tr>

        </thead>

        <tbody>

          <tr>

            <td>
              1
            </td>

            <td>
              <input defaultValue="0" />
            </td>

            <td>
              <input defaultValue="0.000" />
            </td>

            <td>
              <input defaultValue="0.000" />
            </td>

            <td>
              Primary loading
            </td>

          </tr>

          <tr>

            <td>
              1
            </td>

            <td>
              <input defaultValue="0.25" />
            </td>

            <td>
              <input defaultValue="0.120" />
            </td>

            <td>
              <input defaultValue="0.012" />
            </td>

            <td>
              -
            </td>

          </tr>

          <tr>

            <td>
              1
            </td>

            <td>
              <input defaultValue="1.00" />
            </td>

            <td>
              <input defaultValue="0.240" />
            </td>

            <td>
              <input defaultValue="0.024" />
            </td>

            <td>
              -
            </td>

          </tr>

        </tbody>

      </table>

    </div>
  );
}

/* ============================================================
   E-LOG STRESS
   ============================================================ */

function ElogStress() {

  return (
    <div className="graph-panel">

      <h3>
        e-log stress relationship
      </h3>

      <div className="elog-chart">

        <svg
          viewBox="0 0 700 350"
          className="flow-svg"
        >

          <line
            x1="70"
            y1="40"
            x2="70"
            y2="300"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="300"
            x2="650"
            y2="300"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="100"
            x2="650"
            y2="100"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="170"
            x2="650"
            y2="170"
            className="chart-grid"
          />

          <line
            x1="70"
            y1="235"
            x2="650"
            y2="235"
            className="chart-grid"
          />

          <polyline
            points="
              100,70
              190,105
              300,150
              420,215
              560,270
            "
            className="elog-line"
          />

          <circle
            cx="100"
            cy="70"
            r="5"
            className="flow-point"
          />

          <circle
            cx="190"
            cy="105"
            r="5"
            className="flow-point"
          />

          <circle
            cx="300"
            cy="150"
            r="5"
            className="flow-point"
          />

          <circle
            cx="420"
            cy="215"
            r="5"
            className="flow-point"
          />

          <circle
            cx="560"
            cy="270"
            r="5"
            className="flow-point"
          />

        </svg>

      </div>

      <div className="graph-summary">

        <span>
          Compression index
        </span>

        <strong>
          0.31
        </strong>

        <span>
          Preconsolidation stress
        </span>

        <strong>
          92 kPa
        </strong>

      </div>

    </div>
  );
}

/* ============================================================
   CV PLOTS
   ============================================================ */

function CvPlots() {

  return (
    <div className="cv-panel">

      <h3>
        Coefficient of consolidation
      </h3>

      <div className="cv-grid">

        <div className="cv-card">

          <h4>
            Root-time method
          </h4>

          <div className="mini-chart">
            <div className="mini-line" />
          </div>

          <strong>
            Cv = 2.6 m²/yr
          </strong>

        </div>

        <div className="cv-card">

          <h4>
            Log-time method
          </h4>

          <div className="mini-chart">
            <div className="mini-line second" />
          </div>

          <strong>
            Cv = 2.3 m²/yr
          </strong>

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   GENERIC TEST
   ============================================================ */

function GenericTestSection({
  title,
  ags,
  description,
}: {
  title: string;
  ags: string;
  description: string;
}) {

  return (
    <section className="results-card">

      <div className="results-card-header">

        <h2>
          {title}
        </h2>

        <span className="ags-label">
          {ags}
        </span>

      </div>

      <div className="simple-method-panel">

        <p>
          {description}
        </p>

        <div className="coming-soon">
          Test-specific reading interface
          will be implemented here.
        </div>

      </div>

    </section>
  );
}

/* ============================================================
   COMMON COMPONENTS
   ============================================================ */

function WorkflowItem({
  number,
  label,
  active = false,
}: {
  number: string;
  label: string;
  active?: boolean;
}) {

  return (
    <div
      className={
        active
          ? "workflow-item active"
          : "workflow-item"
      }
    >

      <span className="workflow-number">
        {number}
      </span>

      <strong>
        {label}
      </strong>

    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {

  return (
    <label className="field">

      <span className="field-label">
        {label}
      </span>

      {children}

    </label>
  );
}