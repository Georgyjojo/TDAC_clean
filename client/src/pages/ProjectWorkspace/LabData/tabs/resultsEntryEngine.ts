/* Pure calculation + validation for Results Entry. No UI, no I/O. */

export type TestKey =
  | "PSD"
  | "PARTICLE_DENSITY"
  | "ATTERBERG"
  | "SHRINKAGE_LIMIT"
  | "TRIAXIAL_UU"
  | "CONSOLIDATION";

export type Row = Record<string, string>;

export interface MethodData {
  params: Record<string, string>;
  rows: Row[];
  rows2?: Row[];
}

export interface Issue {
  level: "error" | "warning" | "info";
  message: string;
}

export interface ResultItem {
  label: string;
  value: string;
  unit?: string;
}

export interface Evaluation {
  results: ResultItem[];
  issues: Issue[];
  /** Calculated series for plotting */
  curve?: { x: number; y: number }[];
  /** Calculated cells per input row (same index as data.rows) */
  perRow?: Row[];
  /** Calculated cells for the second grid, when a test has one (same index as
   *  data.rows2 - used by the consolidation time-settlement readings). */
  perRow2?: Row[];
  /** Extra AGS preview lines (only where the heading is certain) */
  ags?: string[];
}

const num = (s: string | undefined) =>
  s === undefined || s.trim() === "" ? NaN : Number(s);
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

/**
 * Form-shape defaults per test: method profile name and the ROW SHAPE
 * (which cells a row carries) - but NO example values. Every grid starts
 * empty; all data is entered by the user against a real test.
 */
export function defaultMethodData(test: TestKey): MethodData {
  switch (test) {
    case "PSD":
      return {
        params: {
          // No seeded method text: the profile is chosen from the active
          // method definitions read from lab.method_definition.
          method: "",
          dryMass: "",
          particleDensity: "",
          pretreatment: "",
        },
        rows: [],
      };
    case "PARTICLE_DENSITY":
      return {
        params: {
          method: "",
          pycnometer: "",
          fraction: "",
        },
        rows: [],
      };
    case "SHRINKAGE_LIMIT":
      return {
        params: {
          method: "",
          initialWc: "",
          initialDensity: "",
          preparation: "",
        },
        rows: [],
      };
    case "TRIAXIAL_UU":
      return {
        params: {
          method: "",
          condition: "",
          frame: "",
          failureCriterion: "Peak deviator stress",
        },
        rows: [],
      };
    case "CONSOLIDATION":
      return {
        params: {
          // Specimen description carried by the CONG group, then the dial
          // calibration and the drainage condition the Cv calculation needs.
          method: "",
          congType: "Oedometer (incremental loading)",
          condition: "",
          diameter: "",
          height: "",
          initialVoidRatio: "",
          bulkDensity: "",
          dryDensity: "",
          particleDensity: "",
          initialWc: "",
          finalWc: "",
          saturation: "",
          swellingPressure: "",
          drainage: "Double drainage",
          dialFactor: "0.002",
        },
        // rows: load increments. rows2: the time-settlement readings taken
        // inside those increments.
        rows: [],
        rows2: [],
      };
    default:
      return { params: {}, rows: [] };
  }
}

/** Water density (kg/m³), Kell (1975), 0–40 °C. */
function rhoW(t: number) {
  return (
    (999.83952 + 16.945176 * t - 7.9870401e-3 * t ** 2 - 46.170461e-6 * t ** 3 +
      105.56302e-9 * t ** 4 - 280.54253e-12 * t ** 5) /
    (1 + 16.87985e-3 * t)
  );
}

function waterContent(r: Row) {
  const c = num(r.containerMass), w = num(r.wetContainer), d = num(r.dryContainer);
  return ((w - d) / (d - c)) * 100;
}

/** D at percent-passing p, log-linear between bracketing sieves. */
function dAt(pts: { x: number; y: number }[], p: number): number {
  const s = [...pts].sort((a, b) => a.x - b.x);
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1];
    if (a.y <= p && p <= b.y && b.y !== a.y) {
      const t = (p - a.y) / (b.y - a.y);
      return Math.pow(10, Math.log10(a.x) + t * (Math.log10(b.x) - Math.log10(a.x)));
    }
  }
  return NaN;
}

/* ============================================================
   CONSOLIDATION - time-settlement constructions
   ============================================================ */

const SECONDS_PER_YEAR = 31536000;

/** One time-settlement reading: minutes from load application, dial divisions. */
interface TimePoint {
  t: number;
  y: number;
}

/** Least-squares line y = a + b·x. Null when x carries no spread. */
function leastSquares(pts: TimePoint[]): { a: number; b: number } | null {
  const n = pts.length;
  if (n < 2) return null;
  const sx = pts.reduce((s, p) => s + p.t, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.t * p.t, 0);
  const sxy = pts.reduce((s, p) => s + p.t * p.y, 0);
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const b = (n * sxy - sx * sy) / den;
  return { a: (sy - b * sx) / n, b };
}

/** y on the straight polyline through pts at abscissa x, or NaN outside it. */
function yAt(pts: TimePoint[], x: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    if (x >= p.t && x <= q.t && q.t !== p.t) {
      return p.y + ((x - p.t) / (q.t - p.t)) * (q.y - p.y);
    }
  }
  return NaN;
}

/** Abscissa where the polyline crosses ordinate y, or NaN when it never does. */
function xAt(pts: TimePoint[], y: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const lo = Math.min(p.y, q.y), hi = Math.max(p.y, q.y);
    if (y >= lo && y <= hi && q.y !== p.y) {
      return p.t + ((y - p.y) / (q.y - p.y)) * (q.t - p.t);
    }
  }
  return NaN;
}

/**
 * Taylor's root-time construction. The early part of the settlement curve is
 * straight against root time; extending that straight line to a line 1.15
 * times its own abscissa locates the 100 percent settlement point, and 90
 * percent falls at 0.9 of the way from the corrected zero to it.
 *
 * Returns the times in minutes plus the two ordinates the construction found,
 * or null when the readings do not describe the curve well enough.
 */
function rootTimeConstruction(readings: TimePoint[]) {
  if (readings.length < 4) return null;

  const pts = readings.map((p) => ({ t: Math.sqrt(p.t), y: p.y }));
  const first = (pts[1].y - pts[0].y) / (pts[1].t - pts[0].t);
  if (!Number.isFinite(first) || first === 0) return null;

  // Straight portion: keep taking points while the local slope stays close to
  // the initial one. Once it falls away the curve has left the straight part.
  let k = 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const slope = (pts[i + 1].y - pts[i].y) / (pts[i + 1].t - pts[i].t);
    if (!Number.isFinite(slope) || Math.abs(slope) < 0.8 * Math.abs(first)) break;
    k = i + 1;
  }

  const fit = leastSquares(pts.slice(0, k + 1));
  if (fit === null || fit.b === 0) return null;

  const d0 = fit.a;

  // Where the measured curve sits at 1.15 times the abscissa of the straight
  // line is the 100 percent point.
  let t100 = NaN;
  let d100 = NaN;
  for (let i = k; i < pts.length; i++) {
    const onLine = (pts[i].y - fit.a) / fit.b;
    if (!(onLine > 0)) continue;
    const ratio = pts[i].t / onLine;
    if (ratio < 1.15) continue;
    const prev = pts[i - 1];
    const prevLine = (prev.y - fit.a) / fit.b;
    const prevRatio = prevLine > 0 ? prev.t / prevLine : NaN;
    const span = ratio - prevRatio;
    const f = Number.isFinite(prevRatio) && span !== 0 ? (1.15 - prevRatio) / span : 0;
    const x100 = prev.t + f * (pts[i].t - prev.t);
    d100 = prev.y + f * (pts[i].y - prev.y);
    t100 = x100 * x100;
    break;
  }
  if (!Number.isFinite(t100)) return null;

  const d90 = d0 + 0.9 * (d100 - d0);
  // The construction is read off the root-time axis, so the abscissa is in
  // root minutes and the time itself is its square.
  const x90 = xAt(pts, d90);
  if (!Number.isFinite(x90) || !(x90 > 0)) return null;
  const t90 = x90 * x90;

  return { t90, t50: NaN, t100, d0, d100, d90 };
}

/**
 * Casagrande's log-time construction. The corrected zero comes from the
 * parabolic start of the curve (the drop over four times the time is twice the
 * drop from the corrected zero), and 100 percent from where the steepest
 * tangent meets the tangent to the secondary compression tail.
 */
function logTimeConstruction(readings: TimePoint[]) {
  if (readings.length < 5) return null;

  const pts = readings.map((p) => ({ t: Math.log10(p.t), y: p.y }));

  // Corrected zero: first time whose fourfold time is still inside the data.
  // Read off the log-time axis, which is the axis the construction is drawn on.
  let d0 = NaN;
  for (let i = 0; i < pts.length - 1; i++) {
    const t1 = pts[i].t;
    const d1 = pts[i].y;
    const d4 = yAt(pts, t1 + Math.log10(4));
    if (Number.isFinite(d4)) {
      d0 = 2 * d1 - d4;
      break;
    }
  }
  if (!Number.isFinite(d0)) return null;

  // Steepest tangent over a three-point window.
  let steep: { a: number; b: number } | null = null;
  for (let i = 1; i < pts.length - 1; i++) {
    const fit = leastSquares([pts[i - 1], pts[i], pts[i + 1]]);
    if (fit === null) continue;
    if (steep === null || Math.abs(fit.b) > Math.abs(steep.b)) steep = fit;
  }

  const tail = leastSquares(pts.slice(-3));
  if (steep === null || tail === null) return null;
  if (steep.b === tail.b) return null;

  const x100 = (tail.a - steep.a) / (steep.b - tail.b);
  const d100 = steep.b * x100 + steep.a;
  if (!Number.isFinite(d100) || !(d100 > d0)) return null;

  const d50 = d0 + 0.5 * (d100 - d0);
  // Read off the log-time axis, then undo the logarithm.
  const x50 = xAt(pts, d50);
  if (!Number.isFinite(x50) || !(x50 > 0)) return null;
  const t50 = Math.pow(10, x50);

  return { t90: NaN, t50, t100: NaN, d0, d100, d90: d50 };
}

export function evaluate(test: TestKey, d: MethodData): Evaluation {
  const issues: Issue[] = [];
  const results: ResultItem[] = [];
  const err = (m: string) => issues.push({ level: "error", message: m });
  const warn = (m: string) => issues.push({ level: "warning", message: m });
  const info = (m: string) => issues.push({ level: "info", message: m });
  let curve: Evaluation["curve"];

  const perRow: Row[] = d.rows.map(() => ({}));
  const perRow2: Row[] = (d.rows2 ?? []).map(() => ({}));
  let agsLines: string[] | undefined;

  if (test === "PSD") {
    const total = num(d.params.dryMass);
    if (!(total > 0)) err("Dry specimen mass is required and must be > 0.");
    const items = d.rows.map((r, i) => ({ i, size: num(r.size), ret: num(r.tareRet) - num(r.tare) }));
    const filled = items.filter((x) => d.rows[x.i].size.trim() !== "" || d.rows[x.i].tareRet.trim() !== "");
    const seen = new Set<number>();
    const good: typeof items = [];
    filled.forEach((x) => {
      const r = d.rows[x.i], n = x.i + 1;
      if (!(x.size > 0)) return err(`Row ${n}: sieve size must be a number > 0.`);
      if (seen.has(x.size)) err(`Row ${n}: duplicate sieve size ${x.size}.`);
      seen.add(x.size);
      if (Number.isNaN(x.ret)) return warn(`Sieve ${x.size} mm: tare and tare + retained are required.`);
      if (x.ret < 0) return err(`Sieve ${x.size} mm: tare + retained is less than tare.`);
      if (!r.gratType.trim()) warn(`Sieve ${x.size} mm: GRAT_TYPE not set.`);
      good.push(x);
    });
    if (!good.length) err("No sieve readings entered.");
    let cum = 0;
    const pts: { x: number; y: number }[] = [];
    [...good].sort((a, b) => b.size - a.size).forEach((x) => {
      cum += x.ret;
      const pass = total > 0 ? (1 - cum / total) * 100 : NaN;
      perRow[x.i] = { retained: fmt(x.ret), cumulative: fmt(cum), passing: fmt(pass, 1) };
      if (Number.isFinite(pass)) pts.push({ x: x.size, y: pass });
    });
    if (total > 0 && cum > total) err("Sum of retained masses exceeds dry specimen mass.");
    curve = pts;
    const at = (mm: number) => pts.find((p) => p.x === mm)?.y;
    // Gravel/sand boundary is the 4.75 mm sieve (IS 2720 Part 4, and the
    // mockup's own first sieve row), not the 2 mm fine-earth fraction.
    const pf = at(0.075) ?? at(0.063), p2 = at(4.75);
    if (p2 !== undefined && pf !== undefined) {
      results.push(
        { label: "Gravel", value: fmt(100 - p2, 1), unit: "%" },
        { label: "Sand", value: fmt(p2 - pf, 1), unit: "%" },
        { label: "Fines", value: fmt(pf, 1), unit: "%" }
      );
    } else if (pts.length) info("Gravel/sand/fines need the 4.75 mm and 0.075 (or 0.063) mm sieves.");
    results.push({ label: "Silt", value: "—" }, { label: "Clay", value: "—" });
    const d10 = dAt(pts, 10), d30 = dAt(pts, 30), d60 = dAt(pts, 60);
    if (Number.isFinite(d10) && Number.isFinite(d60)) {
      const cu = d60 / d10, cc = Number.isFinite(d30) ? (d30 * d30) / (d10 * d60) : NaN;
      results.push({ label: "Cu / Cc", value: `${fmt(cu, 1)} / ${fmt(cc, 1)}` });
    } else {
      results.push({ label: "Cu / Cc", value: "—" });
      if (pts.length) info("Cu/Cc not computable: D10/D60 outside the sieve range.");
    }
    if (!(num(d.params.particleDensity) > 0)) warn("Particle density not entered (needed for the hydrometer).");
    info("Hydrometer readings, silt/clay split and advanced GRAT/GRAG fields: pending.");
  }

  if (test === "PARTICLE_DENSITY") {
    const gs: number[] = [], pd: number[] = [];
    d.rows.forEach((r, i) => {
      const [m1, m2, m3, m4, t] = [r.m1, r.m2, r.m3, r.m4, r.temp].map(num);
      if ([m1, m2, m3, m4, t].every(Number.isNaN)) return;
      if ([m1, m2, m3, m4, t].some(Number.isNaN))
        return err(`Trial ${r.trial}: four masses and temperature are required.`);
      if (!(m2 > m1 && m4 > m1)) return err(`Trial ${r.trial}: masses must satisfy m2 > m1 and m4 > m1.`);
      if (t < 0 || t > 40) return err(`Trial ${r.trial}: temperature outside 0–40 °C.`);
      const den = (m4 - m1) - (m3 - m2);
      if (!(den > 0)) return err(`Trial ${r.trial}: invalid mass combination (denominator ≤ 0).`);
      const g = (m2 - m1) / den, p = (g * rhoW(t)) / 1000;
      perRow[i] = { gs: fmt(g, 3), pd: `${fmt(p, 3)} Mg/m3` };
      if (r.use !== "false") { gs.push(g); pd.push(p); }
    });
    if (!gs.length) err("No accepted, complete pycnometer trial.");
    else {
      const mg = gs.reduce((a, b) => a + b, 0) / gs.length, mp = pd.reduce((a, b) => a + b, 0) / pd.length;
      results.push({ label: "Mean Gs", value: fmt(mg, 3) }, { label: "Particle density", value: fmt(mp, 2), unit: "Mg/m3" });
      const vol = /(\d+(?:\.\d+)?)\s*ml/i.exec(d.params.pycnometer ?? "");
      agsLines = [`LPDN_PDEN = ${fmt(mp, 2)}`, "LPDN_TYPE = PYCNOMETER", ...(vol ? [`LPDN_PVOL = ${vol[1]}`] : [])];
    }
    info("Trial-spread acceptance limit and calibration link: pending (method package rules).");
  }

  if (test === "ATTERBERG") {
    const pts: { x: number; y: number }[] = [];
    d.rows.forEach((r, i) => {
      if (r.use === "false") return;
      const w = waterContent(r), n = num(r.blows);
      if (!Number.isFinite(w) || !(n > 0))
        return err(`Liquid trial ${i + 1}: blows and all three masses are required.`);
      if (!(num(r.dryContainer) > num(r.containerMass)) || !(num(r.wetContainer) >= num(r.dryContainer)))
        return err(`Liquid trial ${i + 1}: need wet ≥ dry > container mass.`);
      pts.push({ x: Math.log10(n), y: w });
    });
    const pl: number[] = [];
    (d.rows2 ?? []).forEach((r, i) => {
      const w = waterContent(r);
      if (!Number.isFinite(w)) return err(`Plastic trial ${i + 1}: three masses required.`);
      if (!(num(r.dryContainer) > num(r.containerMass)) || !(num(r.wetContainer) >= num(r.dryContainer)))
        return err(`Plastic trial ${i + 1}: need wet ≥ dry > container mass.`);
      pl.push(w);
    });
    let LL = NaN, FI = NaN;
    if (pts.length < 3) err("At least 3 liquid-limit trials are required for the flow curve.");
    else {
      const n = pts.length, sx = pts.reduce((a, p) => a + p.x, 0), sy = pts.reduce((a, p) => a + p.y, 0);
      const sxx = pts.reduce((a, p) => a + p.x * p.x, 0), sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
      const den = n * sxx - sx * sx;
      if (den === 0) err("Blow counts must differ to fit a flow curve.");
      else {
        const m = (n * sxy - sx * sy) / den, c = (sy - m * sx) / n;
        LL = c + m * Math.log10(25);
        FI = -m;
        if (FI < 0) warn("Flow curve slope is positive (water content rises with blows).");
        if (!pts.some((p) => Math.abs(Math.pow(10, p.x) - 25) <= 10))
          warn("No liquid-limit trial within 15–35 blows.");
      }
    }
    if (!pl.length) err("At least one plastic-limit trial is required.");
    const PL = pl.length ? pl.reduce((a, b) => a + b, 0) / pl.length : NaN;
    const PI = LL - PL;
    // Flow curve: real trial points plus the fitted least-squares line.
    // The regression runs on x = log10(blows); the curve stores x back in
    // blows (10^x) because the chart's x-axis is logarithmic, so the stored
    // x values are the blows counts the user entered.
    if (pts.length >= 2) {
      const xs = pts.map((p) => p.x);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const syy = pts.reduce((a, p) => a + p.y, 0);
      const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
      const xx = pts.reduce((a, p) => a + p.x * p.x, 0);
      const den = pts.length * xx - xs.reduce((a, p) => a + p, 0) ** 2;
      if (den !== 0) {
        const slope = (pts.length * sxy - xs.reduce((a, p) => a + p, 0) * syy) / den;
        const intercept = (syy - slope * xs.reduce((a, p) => a + p, 0)) / pts.length;
        const fitY = (x: number) => slope * x + intercept;
        curve = [
          ...pts.map((p) => ({ x: Math.pow(10, p.x), y: p.y })),
          { x: Math.pow(10, x0), y: fitY(x0) },
          { x: Math.pow(10, x1), y: fitY(x1) },
        ];
      }
    }
    results.push(
      { label: "Liquid limit", value: fmt(LL, 0), unit: "%" },
      { label: "Plastic limit", value: fmt(PL, 0), unit: "%" },
      { label: "Plasticity index", value: fmt(PI, 0) },
      { label: "Flow index", value: fmt(FI, 1) }
    );
    if (Number.isFinite(PI) && PI < 0) err("Plasticity index is negative (PL > LL).");
    if (Number.isFinite(LL) && Number.isFinite(PI)) {
      const above = PI >= 0.73 * (LL - 20);
      results.push({
        label: "Classification aid (interpretation only)",
        value: (LL >= 50 ? "H" : "L") + (above ? " (above A-line)" : " (below A-line)"),
      });
    }
  }

  if (test === "SHRINKAGE_LIMIT") {
    const sl: number[] = [], sr: number[] = [];
    d.rows.forEach((r, i) => {
      const [mw, md, vw, vd] = [r.wetMass, r.dryMass, r.wetVol, r.dryVol].map(num);
      if ([mw, md, vw, vd].every(Number.isNaN)) return;
      if ([mw, md, vw, vd].some(Number.isNaN)) return err(`Trial ${r.trial}: wet/dry mass and wet/dry volume are required.`);
      if (![mw, md, vw, vd].every((v) => v > 0)) return err(`Trial ${r.trial}: masses and volumes must be > 0.`);
      if (md > mw) return err(`Trial ${r.trial}: dry mass exceeds wet mass.`);
      if (vd > vw) warn(`Trial ${r.trial}: dry volume exceeds wet volume.`);
      const w = ((mw - md) / md) * 100;
      const s1 = w - ((vw - vd) / md) * 100; // water density 1 g/cm³
      if (s1 < 0) return err(`Trial ${r.trial}: computed shrinkage limit is negative.`);
      perRow[i] = { sl: fmt(s1, 1), sr: fmt(md / vd, 2) };
      sl.push(s1); sr.push(md / vd);
    });
    if (!sl.length) err("No complete shrinkage trial entered.");
    else {
      const m = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
      results.push({ label: "Mean shrinkage limit", value: fmt(m(sl), 1), unit: "%" }, { label: "Mean shrinkage ratio", value: fmt(m(sr), 2) });
    }
    if (!(num(d.params.initialWc) >= 0)) warn("Initial water content not entered.");
    info("Formula assumes water density 1 g/cm³; method-package units, rounding and tolerances: pending.");
  }

  if (test === "TRIAXIAL_UU") {
    const cus: number[] = [], pts: { x: number; y: number }[] = [];
    d.rows.forEach((r, i) => {
      const v = [r.dia, r.length, r.cell, r.q, r.strain].map(num);
      if (v.every(Number.isNaN)) return;
      if (v.some(Number.isNaN)) return err(`Specimen ${r.spec}: dimensions, cell pressure, q and strain are required.`);
      const [dia, len, cell, q, strain] = v;
      if (!(dia > 0 && len > 0)) return err(`Specimen ${r.spec}: dimensions must be > 0.`);
      if (cell < 0 || strain < 0 || q < 0) return err(`Specimen ${r.spec}: negative value.`);
      if (!r.mode.trim()) warn(`Specimen ${r.spec}: failure mode not stated.`);
      perRow[i] = { cu: fmt(q / 2, 0) };
      cus.push(q / 2); pts.push({ x: strain, y: q });
    });
    if (!cus.length) err("No complete specimen entered.");
    else {
      results.push(
        { label: "Mean cu", value: fmt(cus.reduce((a, b) => a + b, 0) / cus.length, 1), unit: "kPa" },
        { label: "Range", value: `${fmt(Math.min(...cus), 0)}-${fmt(Math.max(...cus), 0)}`, unit: "kPa" },
        { label: "Specimens", value: `${cus.length} accepted` },
        { label: "Calculation", value: "qf / 2" }
      );
    }
    curve = pts;
    info("cu = qf/2 applies only to the UU method rule. Full stress–strain series entry: pending.");
  }

  if (test === "CONSOLIDATION") {
    const e0 = num(d.params.initialVoidRatio);
    const h0 = num(d.params.height);
    const dialFactor = num(d.params.dialFactor);
    const double = (d.params.drainage ?? "").toLowerCase().startsWith("double");
    const touched = (v: string | undefined) => (v ?? "").trim() !== "";

    if (!(e0 > 0)) err("Initial void ratio is required and must be > 0.");
    if (!(h0 > 0)) err("Initial specimen height is required and must be > 0.");
    if (!(dialFactor > 0)) err("Dial factor (mm per division) is required and must be > 0.");

    // Drainage path: water in a double-drained specimen travels half the height.
    const pathM = (double ? h0 / 2 : h0) / 1000;

    // Specimen description for the CONG group - only what was actually entered.
    agsLines = [];
    (
      [
        ["CONG_TYPE", d.params.congType],
        ["CONG_COND", d.params.condition],
        ["CONG_SDIA", d.params.diameter],
        ["CONG_HIGT", d.params.height],
        ["CONG_IVR", d.params.initialVoidRatio],
        ["CONG_BDEN", d.params.bulkDensity],
        ["CONG_DDEN", d.params.dryDensity],
        ["CONG_PDEN", d.params.particleDensity],
        ["CONG_MCI", d.params.initialWc],
        ["CONG_MCF", d.params.finalWc],
        ["CONG_SATR", d.params.saturation],
        ["CONG_SPRS", d.params.swellingPressure],
      ] as [string, string][]
    ).forEach(([heading, value]) => {
      if ((value ?? "").trim() !== "") agsLines!.push(`${heading} = ${value}`);
    });

    // Time-settlement readings, grouped by the increment they were taken in.
    const series = new Map<string, TimePoint[]>();
    (d.rows2 ?? []).forEach((r, i) => {
      const label = (r.stage ?? "").trim();
      const t = num(r.elapsed);
      const dial = num(r.dial);
      if (!touched(r.elapsed) && !touched(r.dial)) return;
      if (!label) return err(`Time reading ${i + 1}: pick the load increment it belongs to.`);
      if (!Number.isFinite(t) || !Number.isFinite(dial))
        return err(`Time reading ${i + 1}: elapsed time and dial reading are both required.`);
      if (!(t > 0)) return err(`Time reading ${i + 1}: elapsed time must be greater than zero.`);
      const list = series.get(label) ?? [];
      list.push({ t, y: dial });
      series.set(label, list);
    });

    // Load increments. Only rows the user has started are considered, and only
    // complete rows join the chain - an increment with a missing value must not
    // silently shift the increment after it.
    interface Stage {
      index: number;
      label: string;
      direction: string;
      stressEnd: number;
      dialStart: number;
      dialEnd: number;
      temp: number;
    }
    const accepted: Stage[] = [];

    d.rows.forEach((r, i) => {
      const label = (r.stage ?? "").trim() || `INC-${i + 1}`;
      if (!touched(r.stress) && !touched(r.dialStart) && !touched(r.dialEnd)) return;

      const stressEnd = num(r.stress);
      const dialStart = num(r.dialStart);
      const dialEnd = num(r.dialEnd);

      if (!Number.isFinite(stressEnd)) return err(`${label}: applied pressure is required.`);
      if (!Number.isFinite(dialStart) || !Number.isFinite(dialEnd))
        return err(`${label}: dial readings at the start and end of the increment are required.`);

      accepted.push({
        index: i,
        label,
        direction: ((r.direction ?? "").trim() || "LOAD").toUpperCase(),
        stressEnd,
        dialStart,
        dialEnd,
        temp: num(r.temp),
      });
    });

    if (!accepted.length) err("No load increment entered.");

    // Readings must climb with time inside an increment, and the increment has
    // to actually move the dial, otherwise the tangent constructions below have
    // nothing to work on.
    series.forEach((list, label) => {
      const sorted = [...list].sort((a, b) => a.t - b.t);
      sorted.forEach((p, i) => {
        if (i > 0 && p.t === sorted[i - 1].t)
          warn(`${label}: two time readings share the same elapsed time.`);
      });
      series.set(label, sorted);
    });

    // Chain the increments: each one starts where the previous one ended.
    let stressStart = 0;
    let eStart = e0;
    const ccSlopes: number[] = [];
    const crSlopes: number[] = [];
    const mvValues: number[] = [];
    const cvValues: number[] = [];
    const kValues: number[] = [];
    const curvePts: { x: number; y: number }[] = [];
    if (Number.isFinite(e0)) curvePts.push({ x: 0, y: e0 });

    for (const s of accepted) {
      const deltaSigma = s.stressEnd - stressStart;
      const unload = s.direction === "UNLOAD";
      if (unload) {
        if (!(deltaSigma < 0)) {
          err(`${s.label}: an unload increment must end below the previous increment (${fmt(stressStart, 1)} kPa).`);
          continue;
        }
      } else if (!(deltaSigma > 0)) {
        err(`${s.label}: applied pressure must exceed the previous increment (${fmt(stressStart, 1)} kPa).`);
        continue;
      }
      const step = Math.abs(deltaSigma);

      const h = (s.dialEnd - s.dialStart) * dialFactor;
      if (h < 0) warn(`${s.label}: the dial falls during the increment (swelling), not compression.`);
      const eEnd = eStart - (h / h0) * (1 + e0);
      if (eEnd < 0) err(`${s.label}: the settlement entered drives the void ratio below zero.`);
      const eAvg = (eStart + eEnd) / 2;

      // Mv is a compression property: on an unload increment the swelling is
      // reported through Cr instead, so Mv stays blank there.
      if (unload)
        info(`${s.label}: unload increment - the swelling feeds Cr, not Mv or permeability.`);
      const mv = unload ? NaN : ((eStart - eEnd) * 1000) / (step * (1 + eAvg));

      // Cv from the increment's own time-settlement readings. Root time uses
      // Tv = 0.848 at 90 percent, log time uses Tv = 0.197 at 50 percent.
      const readings = series.get(s.label) ?? [];
      const root = rootTimeConstruction(readings);
      const log = logTimeConstruction(readings);
      const cvRoot = root ? ((0.848 * pathM * pathM) / (root.t90 * 60)) * SECONDS_PER_YEAR : NaN;
      const cvLog = log ? ((0.197 * pathM * pathM) / (log.t50 * 60)) * SECONDS_PER_YEAR : NaN;

      // A blank Cv is nearly always a run that stopped too early, so say which
      // construction failed instead of leaving the cell empty.
      if (readings.length >= 2 && !root)
        info(`${s.label}: the root time construction needs the readings to run past the end of primary consolidation.`);
      else if (readings.length >= 2 && !log)
        info(`${s.label}: the log time construction needs the dial to level off before the last reading.`);

      // Secondary compression: the void ratio drop per log cycle of time once
      // primary consolidation has finished.
      let ca = NaN;
      if (root && Number.isFinite(root.t100)) {
        const tail = readings.filter((p) => p.t >= root.t100);
        if (tail.length >= 2) {
          const fit = leastSquares(
            tail.map((p) => ({
              t: Math.log10(p.t),
              y: eStart - (((p.y - s.dialStart) * dialFactor) / h0) * (1 + e0),
            }))
          );
          if (fit && Number.isFinite(fit.b)) ca = -fit.b;
        }
      }

      // k = Cv · Mv · gamma_w, with Mv taken to m2/N and gamma_w = 9.81 kN/m3.
      const cvRootM2s = root ? (0.848 * pathM * pathM) / (root.t90 * 60) : NaN;
      const km = cvRootM2s * (mv / 1e6) * 9810;

      const cvLine = root ? `CONS_CVRT = ${fmt(cvRoot, 2)}` : null;
      const logLine = log ? `CONS_CVLG = ${fmt(cvLog, 2)}` : null;
      const caLine = Number.isFinite(ca) ? `CONS_INSC = ${fmt(ca, 4)}` : null;
      const tempLine = Number.isFinite(s.temp) ? `CONS_TEMP = ${fmt(s.temp, 1)}` : null;
      if (readings.length && !root)
        warn(`${s.label}: the root-time construction needs at least four readings that curve over past 90 percent.`);
      if (readings.length && !log)
        warn(`${s.label}: the log-time construction needs at least five readings spanning past 50 percent.`);
      if (!readings.length)
        info(`${s.label}: no time-settlement readings, so Cv and permeability stay blank.`);

      perRow[s.index] = {
        h: fmt(h, 2),
        eStart: fmt(eStart, 4),
        eEnd: fmt(eEnd, 4),
        mv: fmt(mv, 3),
        t90: root ? fmt(root.t90, 2) : "—",
        cvRoot: root ? fmt(cvRoot, 2) : "—",
        t50: log ? fmt(log.t50, 2) : "—",
        cvLog: log ? fmt(cvLog, 2) : "—",
        ca: Number.isFinite(ca) ? fmt(ca, 4) : "—",
        k: Number.isFinite(km) ? km.toExponential(2) : "—",
      };

      if (Number.isFinite(mv)) mvValues.push(mv);
      if (Number.isFinite(cvRoot)) cvValues.push(cvRoot);
      if (Number.isFinite(km)) kValues.push(km);
      curvePts.push({ x: s.stressEnd, y: eEnd });

      const dLog = Math.abs(Math.log10(s.stressEnd) - Math.log10(stressStart));
      if (stressStart > 0 && dLog > 0 && Number.isFinite(eEnd)) {
        const slope = Math.abs((eStart - eEnd) / dLog);
        if (unload) crSlopes.push(slope);
        else ccSlopes.push(slope);
      }

      // One CONS line per increment. Heading meanings are the AGS ones:
      // INCN identifies the increment, IVR/INCE are the voids ratio at its
      // start and end, INCF is the stress at its end, INMV the volume
      // compressibility, INSC the secondary compression, CVRT/CVLG the
      // coefficient of consolidation from the root time and log time
      // constructions.
      agsLines.push(
        [
          `CONS_INCN = ${s.label}`,
          `CONS_IVR = ${fmt(eStart, 4)}`,
          `CONS_INCF = ${fmt(s.stressEnd, 1)}`,
          `CONS_INCE = ${fmt(eEnd, 4)}`,
          Number.isFinite(mv) ? `CONS_INMV = ${fmt(mv, 3)}` : null,
          caLine,
          cvLine,
          logLine,
          tempLine,
        ]
          .filter((v): v is string => v !== null)
          .join(", ")
      );

      stressStart = s.stressEnd;
      eStart = eEnd;
    }

    // Per-reading cells: displacement from the increment's own start, then the
    // strain and void ratio that displacement produces.
    (d.rows2 ?? []).forEach((r, i) => {
      const label = (r.stage ?? "").trim();
      const dial = num(r.dial);
      if (!label || !Number.isFinite(dial) || !(dialFactor > 0) || !(h0 > 0) || !(e0 > 0)) return;
      const stage = accepted.find((s) => s.label === label);
      if (!stage) return;
      const disp = (dial - stage.dialStart) * dialFactor;
      perRow2[i] = {
        disp: fmt(disp, 2),
        strain: fmt((disp / h0) * 100, 3),
        e: fmt(e0 - (disp / h0) * (1 + e0), 4),
      };
    });

    // Kept in the order the increments were applied: a test with an unload
    // increment retraces its stress axis, so sorting by stress would draw the
    // rebound branch as a zig-zag instead of a loop.
    curve = curvePts;

    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
    const mvMean = mean(mvValues);
    const cvMean = mean(cvValues);
    const kMean = mean(kValues);

    if (!mvValues.length && accepted.length)
      info("Mv needs a completed increment with a pressure step and both dial readings.");

    results.push(
      { label: "Mean Mv", value: fmt(mvMean, 3), unit: "m2/MN" },
      { label: "Mean Cv", value: fmt(cvMean, 2), unit: "m2/yr" },
      {
        label: "Permeability",
        value: Number.isFinite(kMean) ? kMean.toExponential(2) : "—",
        unit: "m/s",
      },
      { label: "Initial void ratio", value: fmt(e0, 3) },
      {
        label: "Compression index Cc (steepest load increment)",
        value: ccSlopes.length ? fmt(Math.max(...ccSlopes), 3) : "—",
      },
      {
        label: "Recompression index Cr (unload increments)",
        value: crSlopes.length ? fmt(mean(crSlopes), 3) : "—",
      },
      { label: "Load increments", value: `${accepted.length} accepted` },
      {
        label: "Drainage path",
        value: Number.isFinite(pathM) ? fmt(pathM * 1000, 2) : "—",
        unit: "mm",
      }
    );

    if (!crSlopes.length && accepted.length)
      info("No unload increment: the recompression index Cr cannot be formed.");
    if (!Number.isFinite(mean(kValues)) && cvValues.length)
      info("Permeability needs both Cv and Mv for the same increment.");
    info("Preconsolidation stress needs the Casagrande curvature construction: pending (method package rules).");
    info("Per-increment values go to CONS, the specimen description to CONG.");
  }

  return { results, issues, curve, perRow, perRow2, ags: agsLines };
}
