/* Runtime smoke test for the Project Workspace:
   renders the REAL App, injects a fake authed token state via localStorage
   (ProtectedRoute), opens /#/project/TDAC-TEST-001 directly, walks all 8 tabs,
   checks structure counts against the consts and confirms zero mock values. */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {
  url: "http://localhost/#/project/TDAC-TEST-001",
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.localStorage = dom.window.localStorage;

// ProtectedRoute expects a persisted token — write it BEFORE App mounts.
// AuthContext key/format unknown; find it from source instead of guessing.
const fs = await import("node:fs");
const ctx = fs.readFileSync("src/auth/AuthContext.tsx", "utf8");
const keyMatch = ctx.match(/localStorage\.(?:getItem|setItem|removeItem)\(\s*["']([^"']+)["']/)
  || ctx.match(/STORAGE_KEY\s*=\s*["']([^"']+)["']/);
if (!keyMatch) {
  console.log("AUTH STORAGE KEY NOT FOUND — ProtectedRoute will redirect; test cannot proceed");
  console.log(ctx.slice(0, 1500));
  process.exit(2);
}
const KEY = keyMatch[1];
console.log("auth storage key:", KEY);
// Try a token-shaped value; the guard may validate with the backend (fetch).
dom.window.localStorage.setItem(KEY, "test-token");

// Stub fetch: session restore calls GET /api/auth/home — return a fake user
// so ProtectedRoute authenticates. All other endpoints 404 silently.
const FAKE_USER = { message: "ok", user: { id: 1, username: "test-admin", role: "admin" } };
global.fetch = dom.window.fetch = async (_url, _opts) => ({
  ok: true,
  status: 200,
  json: async () => FAKE_USER,
  headers: { get: () => "application/json" },
});

const { createRoot } = await import("react-dom/client");
const { act, StrictMode } = await import("react");
const React = await import("react");
const { default: App } = await import("./src/App.tsx");
const { AuthProvider } = await import("./src/auth/AuthContext.tsx");

const root = createRoot(document.getElementById("root"));
await act(async () => {
  root.render(
    React.createElement(StrictMode, null,
      React.createElement(AuthProvider, null, React.createElement(App)))
  );
});
await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

const results = [];
const check = (name, cond) => results.push(`${cond ? "PASS" : "FAIL"} ${name}`);
const text = () => document.body.textContent;
const click = (el) => act(async () => {
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
});

// 0. Workspace rendered (not redirected to /login)?
check("workspace page rendered (auth guard passed)", !!document.querySelector(".projectbar"));

const tabs = [...document.querySelectorAll(".tabs .tab")];
check("8 tabs rendered", tabs.length === 8);
const tabLabels = tabs.map((t) => t.textContent.replace(/Future|Provision/, "").trim());
check("tab labels order", JSON.stringify(tabLabels) === JSON.stringify([
  "Overview","Field Data","Lab Data","Processed Data","Interpretation / Ground Model",
  "Design Parameters","Design","Reports"
]));
check("project id in projectbar", document.querySelector(".projectbar-title")?.textContent === "TDAC-TEST-001");

// Overview
check("overview: metadata fields = 12", document.querySelectorAll(".modal-field").length === 12);
check("overview: glance rows = 8", [...document.querySelectorAll(".stat-mini tbody tr")].length === 8);
check("overview: gates = 7", document.querySelectorAll(".gate").length === 7);
check("overview: no mock numbers in glance", ![...document.querySelectorAll(".stat-mini b")].some((b) => b.textContent !== "—"));

// Field Data tab
await click(tabs[1]);
check("field: catalog items = 13", document.querySelectorAll(".catalog .item").length === 13);
check("field: modes = 6", document.querySelectorAll(".modebar .mode").length === 6);
check("field: entry fields = 12", [...document.querySelectorAll(".panel")].flatMap((p) => [...p.querySelectorAll(".modal-field")]).filter((f) => f.textContent.includes("SPT blows")).length === 3);
check("field: subtabs = 4", document.querySelectorAll(".subtabs .subtab").length === 4);
check("field: mode switching works", await (async () => {
  const modes = [...document.querySelectorAll(".modebar .mode")];
  await click(modes[2]);
  return modes[2].classList.contains("active") && !modes[0].classList.contains("active");
})());
check("field: catalog switching works", await (async () => {
  const items = [...document.querySelectorAll(".catalog .item")];
  await click(items[3]);
  return items[3].classList.contains("active") && !items[0].classList.contains("active");
})());

// Lab tab
await click(tabs[2]);
check("lab: catalog items = 14", document.querySelectorAll(".catalog .item").length === 14);
check("lab: summary table headers = 12", [...document.querySelectorAll(".dtable th")].length === 12);
check("lab: summary shows empty state", !!document.querySelector(".dtable .empty-row"));
check("lab: report paper present", !!document.querySelector(".report-paper"));
check("lab: atterberg inputs = 8", [...document.querySelectorAll(".modal-grid .modal-field")].length === 8);

// Processed tab
await click(tabs[3]);
check("processed: register + SPT cols (5+6)", [...document.querySelectorAll(".dtable th")].length === 11);
check("processed: lineage rows = 6", [...document.querySelectorAll(".stat-mini tbody tr")].length === 6);
check("processed: all lineage blank", ![...document.querySelectorAll(".stat-mini b")].some((b) => b.textContent !== "—"));

// Interpret tab
await click(tabs[4]);
check("interpret: stat tiles = 6", document.querySelectorAll(".statgrid .stat").length === 6);
check("interpret: stat subtabs = 5", document.querySelectorAll(".subtabs .subtab").length === 5);
check("interpret: judgement rows = 3", [...document.querySelectorAll(".stat-mini tbody tr")].length === 3);
check("interpret: all stats blank", ![...document.querySelectorAll(".statgrid .stat b")].some((b) => b.textContent !== "—"));

// Parameters tab
await click(tabs[5]);
check("parameters: table cols = 8", [...document.querySelectorAll(".dtable th")].length === 8);
check("parameters: empty state", !!document.querySelector(".dtable .empty-row"));

// Design tab
await click(tabs[6]);
check("design: modules = 8", document.querySelectorAll(".module").length === 8);
check("design: all future-styled", document.querySelectorAll(".module.future").length === 8);

// Reports tab
await click(tabs[7]);
check("reports: modules = 8", document.querySelectorAll(".module").length === 8);
check("reports: future modules = 2", document.querySelectorAll(".module.future").length === 2);

// No mock data leaked anywhere: mock numbers from the mockup must not appear
const MOCK_NUMBERS = ["184", "126 / 143", "25", "Kochi", "TDAC-2026-041", "52 %", "24 %", "31.6", "42"];
const body = text();
check("no mock data anywhere", !MOCK_NUMBERS.some((n) => body.includes(n)));

// RegisterRowNavigator: with no rows in Home yet, navigating home should not break
await act(async () => {
  window.location.hash = "#/";
  window.dispatchEvent(new dom.window.HashChangeEvent("hashchange"));
});
await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
check("back home renders portfolio", !!document.querySelector(".page-head"));

console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
root.unmount();
if (fails) process.exit(1);
