import { useMemo, useState, type ReactNode } from "react";
import { evaluate, type Evaluation, type MethodData, type TestKey } from "./resultsEntryEngine";

/* ---------- small shared pieces (existing TDAC CSS classes) ---------- */

function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Header({ title, ags }: { title: string; ags: string }) {
  return (
    <div className="results-card-header">
      <h2>{title}</h2>
      <span className="ags-label">AGS&nbsp;&nbsp;{ags}</span>
    </div>
  );
}

function Sel({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const all = options.includes(value) || value === "" ? options : [value, ...options];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {all.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function Calc({ children }: { children: ReactNode }) {
  return <td className="calculated-cell">{children ?? "—"}</td>;
}

function Summary({ title, items, note, warning }: {
  title: string;
  items: { label: string; value: string; unit?: string }[];
  note?: string;
  warning?: string;
}) {
  return (
    <div className="reported-card">
      <h3>{title}</h3>
      {items.map((r) => (
        <div className="reported-row" key={r.label}>
          <span>{r.label}</span>
          <strong>{r.value}{r.unit ? ` ${r.unit}` : ""}</strong>
        </div>
      ))}
      {note && <div className="re-note">{note}</div>}
      {warning && <div className="classification-note">{warning}</div>}
    </div>
  );
}

/** Simple SVG plot in the same style as the Atterberg flow curve. */
function Plot({ title, pts, logX, xLabel, yLabel, xMin, xMax, yMax, labels }: {
  title: string;
  pts: { x: number; y: number }[];
  logX?: boolean;
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMax: number;
  labels?: boolean;
}) {
  const X0 = 70, X1 = 560, Y0 = 260, Y1 = 40;
  const tx = (x: number) =>
    X0 + ((logX ? Math.log10(x) - Math.log10(xMin) : x - xMin) /
      (logX ? Math.log10(xMax) - Math.log10(xMin) : xMax - xMin)) * (X1 - X0);
  const ty = (y: number) => Y0 - (y / yMax) * (Y0 - Y1);
  const sorted = [...pts].filter((p) => p.x > 0 || !logX).sort((a, b) => a.x - b.x);
  return (
    <div className="flow-curve-card">
      <h3>{title}</h3>
      <div className="flow-chart">
        <div className="chart-y-label">{yLabel}</div>
        <svg viewBox="0 0 600 300" className="flow-svg" role="img" aria-label={title}>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`h${i}`} x1={X0} x2={X1} y1={Y0 - (i * (Y0 - Y1)) / 4} y2={Y0 - (i * (Y0 - Y1)) / 4} className="chart-grid" />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`v${i}`} y1={Y1} y2={Y0} x1={X0 + (i * (X1 - X0)) / 4} x2={X0 + (i * (X1 - X0)) / 4} className="chart-grid" />
          ))}
          {sorted.length > 1 && !labels && (
            <polyline className="flow-line" points={sorted.map((p) => `${tx(p.x)},${ty(p.y)}`).join(" ")} />
          )}
          {sorted.map((p, i) => (
            <circle key={i} cx={tx(p.x)} cy={ty(p.y)} r={6} className="flow-point" />
          ))}
        </svg>
        <div className="chart-x-label">{xLabel}</div>
      </div>
    </div>
  );
}

const blank = (cols: string[]) => Object.fromEntries(cols.map((c) => [c, ""]));

/* ---------- method panel ---------- */

export const HAS_PANEL: TestKey[] = ["PSD", "PARTICLE_DENSITY", "SHRINKAGE_LIMIT", "TRIAXIAL_UU"];

export function MethodPanel({ test, data, onChange }: {
  test: TestKey;
  data: MethodData;
  onChange: (d: MethodData) => void;
}) {
  const live = useMemo(() => evaluate(test, data), [test, data]);
  const [tab, setTab] = useState<"sieve" | "hydro" | "curve" | "ags">("sieve");
  const P = data.params;
  const setP = (k: string, v: string) => onChange({ ...data, params: { ...P, [k]: v } });
  const setC = (i: number, k: string, v: string) =>
    onChange({ ...data, rows: data.rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const inp = (i: number, k: string) => (
    <td><input value={data.rows[i][k] ?? ""} onChange={(e) => setC(i, k, e.target.value)} /></td>
  );
  const pr = (i: number, k: string) => live.perRow?.[i]?.[k] ?? "—";
  const res = (label: string) => live.results.find((r) => r.label === label);
  const subtab = (id: typeof tab, label: string) => (
    <button type="button" className={tab === id ? "subtab active" : "subtab"} onClick={() => setTab(id)}>{label}</button>
  );

  if (test === "PSD") {
    return (
      <>
        <section className="results-card">
          <Header title="Grain size analysis" ags="GRAG + GRAT" />
          <div className="method-grid">
            <F label="Method profile"><Sel value={P.method} options={["IS 2720 Part 4 - Sieve + hydrometer"]} onChange={(v) => setP("method", v)} /></F>
            <F label="Dry specimen mass (g)"><input value={P.dryMass} onChange={(e) => setP("dryMass", e.target.value)} /></F>
            <F label="Particle density (Mg/m3)"><input value={P.particleDensity} onChange={(e) => setP("particleDensity", e.target.value)} /></F>
            <F label="Pre-treatment"><Sel value={P.pretreatment} options={["Wet sieve and dispersant", "Dry sieve"]} onChange={(v) => setP("pretreatment", v)} /></F>
          </div>
          <div className="subtabs">
            {subtab("sieve", "Sieve readings")}
            {subtab("hydro", "Hydrometer readings")}
            {subtab("curve", "Combined curve")}
            {subtab("ags", "Advanced AGS fields")}
          </div>
          {tab === "sieve" && (
            <>
              <div className="table-wrapper">
                <table className="results-table">
                  <thead><tr>
                    <th>No.</th><th>Sieve (mm)</th><th>Tare (g)</th><th>Tare + retained (g)</th>
                    <th>Retained (g)</th><th>Cumulative (g)</th><th>Passing (%)</th><th>GRAT_TYPE</th><th />
                  </tr></thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>{inp(i, "size")}{inp(i, "tare")}{inp(i, "tareRet")}
                        <Calc>{pr(i, "retained")}</Calc><Calc>{pr(i, "cumulative")}</Calc><Calc>{pr(i, "passing")}</Calc>
                        <td><Sel value={r.gratType} options={["WS", "DS", "HYD"]} onChange={(v) => setC(i, "gratType", v)} /></td>
                        <td><button type="button" title="Remove row" onClick={() => onChange({ ...data, rows: data.rows.filter((_, j) => j !== i) })}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="re-add" onClick={() => onChange({ ...data, rows: [...data.rows, { ...blank(["size", "tare", "tareRet"]), gratType: "WS" }] })}>+ Add sieve row</button>
            </>
          )}
          {tab === "hydro" && <div className="re-note">Hydrometer readings are not implemented yet (pending method definition: calibration, dispersant and corrections).</div>}
          {tab === "curve" && <div className="re-note">The combined grading curve is shown below the readings.</div>}
          {tab === "ags" && <div className="re-note">Advanced GRAG/GRAT fields: pending. Only GRAT_TYPE is captured per sieve.</div>}
        </section>
        <div className="atterberg-bottom">
          <Plot title="Combined grading curve" pts={live.curve ?? []} logX xMin={0.01} xMax={100} yMax={100}
            xLabel="Particle size (mm, logarithmic scale)" yLabel="% passing" />
          <Summary title="Calculated summary" items={live.results.map((r) => ({ label: r.label, value: r.value, unit: r.unit }))}
            note="Sieve and hydrometer rows are retained as raw observations. The released size-percentage pairs are projected to GRAT; summary fractions are projected to GRAG." />
        </div>
      </>
    );
  }

  if (test === "PARTICLE_DENSITY") {
    return (
      <>
        <section className="results-card">
          <Header title="Particle density and specific gravity" ags="LPDN" />
          <div className="method-grid">
            <F label="Method profile"><Sel value={P.method} options={["IS 2720 Part 3 - Pycnometer"]} onChange={(v) => setP("method", v)} /></F>
            <F label="Pycnometer"><Sel value={P.pycnometer} options={["PYK-04 · 50 ml", "PYK-05 · 50 ml", "PYK-06 · 100 ml"]} onChange={(v) => setP("pycnometer", v)} /></F>
            <F label="Calibration"><input value="Not linked (calibration register pending)" readOnly /></F>
            <F label="Material fraction"><input value={P.fraction} onChange={(e) => setP("fraction", e.target.value)} /></F>
          </div>
          <div className="table-wrapper">
            <table className="results-table">
              <thead><tr>
                <th>Trial</th><th>M1 empty (g)</th><th>M2 + dry soil (g)</th><th>M3 + soil + water (g)</th><th>M4 + water (g)</th>
                <th>Temp (C)</th><th>Gs</th><th>Particle density</th><th>Use</th>
              </tr></thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.trial}</td>{inp(i, "m1")}{inp(i, "m2")}{inp(i, "m3")}{inp(i, "m4")}{inp(i, "temp")}
                    <Calc>{pr(i, "gs")}</Calc><Calc>{pr(i, "pd")}</Calc>
                    <td>
                      <button type="button" className={r.use !== "false" ? "use-button active" : "use-button"}
                        onClick={() => setC(i, "use", r.use === "false" ? "true" : "false")}>
                        {r.use !== "false" ? "Yes" : "No"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="re-add" onClick={() => onChange({ ...data, rows: [...data.rows, { ...blank(["m1", "m2", "m3", "m4"]), trial: String(data.rows.length + 1), temp: "", use: "true" }] })}>+ Add trial</button>
        </section>
        <div className="re-metrics">
          <Summary title="Mean Gs" items={[{ label: "Gs", value: res("Mean Gs")?.value ?? "—" }]} />
          <Summary title="Particle density" items={[{ label: "Mg/m3", value: res("Particle density")?.value ?? "—" }]} />
          <div className="reported-card">
            <h3>AGS conversion</h3>
            {(live.ags ?? ["Not calculated"]).map((l) => <div key={l} className="re-mono">{l}</div>)}
          </div>
        </div>
      </>
    );
  }

  if (test === "SHRINKAGE_LIMIT") {
    return (
      <section className="results-card">
        <Header title="Shrinkage limit" ags="LSLT" />
        <div className="method-grid">
          <F label="Method profile"><Sel value={P.method} options={["IS 2720 Part 6 - Shrinkage factors"]} onChange={(v) => setP("method", v)} /></F>
          <F label="Initial water content (%)"><input value={P.initialWc} onChange={(e) => setP("initialWc", e.target.value)} /></F>
          <F label="Initial density (Mg/m3)"><input value={P.initialDensity} onChange={(e) => setP("initialDensity", e.target.value)} /></F>
          <F label="Specimen preparation"><input value={P.preparation} onChange={(e) => setP("preparation", e.target.value)} /></F>
        </div>
        <div className="table-wrapper">
          <table className="results-table">
            <thead><tr>
              <th>Trial</th><th>Wet mass (g)</th><th>Dry mass (g)</th><th>Wet volume (cm3)</th><th>Dry volume (cm3)</th>
              <th>Shrinkage limit (%)</th><th>Shrinkage ratio</th>
            </tr></thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.trial}</td>{inp(i, "wetMass")}{inp(i, "dryMass")}{inp(i, "wetVol")}{inp(i, "dryVol")}
                  <Calc>{pr(i, "sl")}</Calc><Calc>{pr(i, "sr")}</Calc>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="re-add" onClick={() => onChange({ ...data, rows: [...data.rows, { ...blank(["wetMass", "dryMass", "wetVol", "dryVol"]), trial: String(data.rows.length + 1) }] })}>+ Add trial</button>
        <div className="re-note">The visible inputs change with the selected standard and volume determination method. The method package owns the formula, units, rounding and acceptance tolerances.</div>
      </section>
    );
  }

  /* TRIAXIAL_UU */
  return (
    <>
      <section className="results-card">
        <Header title="Unconsolidated undrained triaxial test" ags="TRIG + TRIT" />
        <div className="method-grid">
          <F label="Method profile"><Sel value={P.method} options={["IS 2720 Part 11 - UU"]} onChange={(v) => setP("method", v)} /></F>
          <F label="Sample condition"><Sel value={P.condition} options={["Undisturbed", "Remoulded", "Compacted"]} onChange={(v) => setP("condition", v)} /></F>
          <F label="Load frame"><Sel value={P.frame} options={["TRX-02 · Calibration valid"]} onChange={(v) => setP("frame", v)} /></F>
          <F label="Failure criterion"><Sel value={P.failureCriterion} options={["Peak deviator stress", "15% axial strain"]} onChange={(v) => setP("failureCriterion", v)} /></F>
        </div>
        <div className="table-wrapper">
          <table className="results-table">
            <thead><tr>
              <th>Specimen</th><th>Dia (mm)</th><th>Length (mm)</th><th>Cell pressure (kPa)</th><th>q at failure (kPa)</th>
              <th>Strain (%)</th><th>cu (kPa)</th><th>Failure mode</th>
            </tr></thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.spec}</td>{inp(i, "dia")}{inp(i, "length")}{inp(i, "cell")}{inp(i, "q")}{inp(i, "strain")}
                  <Calc><b>{pr(i, "cu")}</b></Calc>
                  <td><Sel value={r.mode} options={["", "Barrelling", "Shear plane", "Bulging"]} onChange={(v) => setC(i, "mode", v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="re-add" onClick={() => onChange({ ...data, rows: [...data.rows, { ...blank(["dia", "length", "cell", "q", "strain"]), spec: `UU-${data.rows.length + 1}`, mode: "" }] })}>+ Add specimen</button>
      </section>
      <div className="atterberg-bottom">
        <Plot title="Deviator stress versus axial strain (failure points)" pts={live.curve ?? []} labels
          xMin={0} xMax={15} yMax={Math.max(100, ...(live.curve ?? []).map((p) => p.y * 1.2))}
          xLabel="Axial strain (%)" yLabel="q (kPa)" />
        <Summary title="Series summary" items={live.results.map((r) => ({ label: r.label, value: r.value, unit: r.unit }))}
          warning="The qf/2 calculation is enabled only by the approved UU method rule. Do not infer a zero total-stress friction angle for other triaxial methods." />
      </div>
    </>
  );
}

/* ---------- input modes (mockup: modebar) ---------- */

const MODES = ["Manual", "Instrument file", "AGS", "Excel / CSV", "Bulk paste", "LIMS / API"];

export function InputModes() {
  return (
    <div className="modebar">
      <b>Input:</b>
      {MODES.map((m) => (
        <button key={m} type="button" className={m === "Manual" ? "mode active" : "mode"}
          disabled={m !== "Manual"} style={m !== "Manual" ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
          title={m === "Manual" ? "Available" : "Not available: no backend support yet"}>
          {m}
        </button>
      ))}
      <span className="modebar-spacer" />
      <button type="button" className="btn btn-sm method-template-button" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}
        title="Not available yet">
        Download method template
      </button>
    </div>
  );
}

/* ---------- validation / release ---------- */

const AGS_CODE: Record<TestKey, string> = {
  PSD: "GRAG + GRAT",
  PARTICLE_DENSITY: "LPDN",
  ATTERBERG: "LLPL",
  SHRINKAGE_LIMIT: "LSLT",
  TRIAXIAL_UU: "TRIG + TRIT",
  CONSOLIDATION: "CONG + CONS",
};

export function PipelineCards({ test, evaluation, stale, notice }: {
  test: TestKey;
  evaluation: Evaluation | null;
  stale: boolean;
  notice: string;
}) {
  return (
    <section className="results-card">
      <div className="results-card-header">
        <h2>Validation · QA · Release</h2>
        <span className="ags-label">AGS&nbsp;&nbsp;{AGS_CODE[test]}</span>
      </div>
      {!evaluation && <p className="re-muted">Not run. Use “Calculate and validate”.</p>}
      {evaluation && stale && <p className="re-warn">Inputs changed since last validation — run again.</p>}
      {evaluation && !evaluation.issues.length && <p className="re-ok">No issues.</p>}
      {evaluation?.issues.map((i, k) => (
        <div key={k} className={`re-issue re-${i.level}`}>
          <strong>{i.level === "error" ? "Blocking" : i.level === "warning" ? "Warning" : "Info"}</strong> {i.message}
        </div>
      ))}
      {evaluation && (test === "ATTERBERG") && evaluation.results.map((r) => (
        <div className="reported-row" key={r.label}>
          <span>{r.label} (calculated from entered readings)</span>
          <strong>{r.value}{r.unit ? ` ${r.unit}` : ""}</strong>
        </div>
      ))}
      {evaluation && test === "ATTERBERG" && !stale &&
        evaluation.results.filter((r) => ({ "Liquid limit": "LLPL_LL", "Plastic limit": "LLPL_PL", "Plasticity index": "LLPL_PI" } as Record<string, string>)[r.label])
          .map((r) => (
            <div className="re-mono" key={r.label}>
              {({ "Liquid limit": "LLPL_LL", "Plastic limit": "LLPL_PL", "Plasticity index": "LLPL_PI" } as Record<string, string>)[r.label]} = {r.value} (preview, unreleased)
            </div>
          ))}
      <p className="re-muted">
        QA and release are not available: the backend has no submit/approval endpoint. Nothing on this page has been sent to the server.
      </p>
      {notice && <div className="re-notice">{notice}</div>}
    </section>
  );
}
