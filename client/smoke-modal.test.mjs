/* Runtime smoke test: Add New Project page + Topbar account menu.
   Renders the REAL App (AuthProvider + HashRouter) at /#/projects/new,
   checks the full register form field list and Cancel navigation, plus the
   account menu open/close + change-password modal paths. */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {
  url: "http://localhost/#/projects/new",
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.localStorage = dom.window.localStorage;

// ProtectedRoute needs a persisted token; write it BEFORE App mounts.
dom.window.localStorage.setItem("access_token", "test-token");
dom.window.localStorage.setItem("refresh_token", "test-refresh");

// Session restore calls GET /api/auth/home; the portfolio register calls
// GET /api/portfolio/summary. Route each URL to the shape its caller
// expects so the real pages render without a backend.
global.fetch = dom.window.fetch = async (url, _opts) => {
  if (String(url).includes("/api/auth/home")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ message: "ok", user: { id: 1, username: "test-admin", role: "admin" } }),
      headers: { get: () => "application/json" },
    };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({ projects: [], total_projects: 0, active_projects: 0, completed_projects: 0 }),
    headers: { get: () => "application/json" },
  };
};

const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const React = await import("react");
const { default: App } = await import("./src/App.tsx");
const { AuthProvider } = await import("./src/auth/AuthContext.tsx");

const root = createRoot(document.getElementById("root"));
await act(async () => {
  root.render(
    React.createElement(AuthProvider, null, React.createElement(App))
  );
});
await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

const results = [];
const check = (name, cond) => results.push(`${cond ? "PASS" : "FAIL"} ${name}`);
const click = (el) => act(async () => {
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
});
const pressKey = (key) => act(async () => {
  window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
});

// 1. Create-project page rendered (auth guard passed, route resolved)
const page = () => document.querySelector(".page-title");
check("Add New Project page rendered", page()?.textContent === "Add New Project");

// 2. The whole register form, in the order CreateProject.tsx renders it
const EXPECTED = [
  "project_id", "project_name", "project_location", "project_client",
  "road_reference", "chainage_text", "structure_reference", "selected_boreholes",
  "consultant_name", "contractor_name", "report_title", "report_volume_title",
  "document_reference", "revision", "report_date", "tdac_company_name",
];
const formInputs = [...document.querySelectorAll("form input")];
const names = formInputs.map((i) => i.name);
check(`form fields = ${EXPECTED.length} (got ${names.length})`,
  JSON.stringify(names) === JSON.stringify(EXPECTED));
check("every form field is required", formInputs.every((i) => i.required));

// 3. Blank on arrival except the company name, which defaults to TDAC
const blankNames = formInputs.filter((i) => i.value === "").map((i) => i.name);
check("all inputs blank except tdac_company_name",
  JSON.stringify(blankNames) === JSON.stringify(EXPECTED.filter((n) => n !== "tdac_company_name")));
check("tdac_company_name carries its default",
  formInputs.find((i) => i.name === "tdac_company_name")?.value === "TDAC Geotechnical Solutions Private Limited");
check("project_id always required",
  document.querySelector('input[name="project_id"]')?.required === true);
check("project_name required",
  document.querySelector('input[name="project_name"]')?.required === true);

// 4. Page head: Cancel only. Import from Excel now lives in the workspace
// overview, where smoke-workspace covers it.
const headButtons = [...document.querySelectorAll(".page-head-actions button")];
check("page head offers Cancel only",
  JSON.stringify(headButtons.map((b) => b.textContent.trim())) === JSON.stringify(["Cancel"]));

// 5. Cancel navigates back to the portfolio register
await click(headButtons.find((b) => b.textContent.trim() === "Cancel"));
await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
check("Cancel navigates home", window.location.hash === "#/" || page()?.textContent !== "Add New Project");
// return to the create page for the topbar checks
await act(async () => { window.location.hash = "#/projects/new"; });
await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

// 6. Topbar account menu: avatar + username + role chip
const trigger = document.querySelector(".account-trigger");
check("account trigger rendered (avatar + name + role)", !!trigger);
check("avatar initials from username", document.querySelector(".avatar")?.textContent === "T");
check("role chip admin",
  [...document.querySelectorAll(".account-trigger .chip")].some((c) => c.textContent === "admin"));
check("dropdown closed before click", !document.querySelector(".account-dropdown"));

// 7. Click opens the dropdown with both items
await click(trigger);
const dropdown = document.querySelector(".account-dropdown");
check("dropdown opens on click", !!dropdown);
const items = [...document.querySelectorAll(".account-item")].map((b) => b.textContent.trim());
check("menu items Change password + Sign out",
  JSON.stringify(items) === JSON.stringify(["Change password", "Sign out"]));

// 8. Change password opens the modal with 3 fields + live-match hint area
await click([...document.querySelectorAll(".account-item")].find((b) => b.textContent.trim() === "Change password"));
const pwModal = document.querySelector(".modal");
check("change-password modal opens", !!pwModal);
check("modal labelled",
  document.getElementById(pwModal?.getAttribute("aria-labelledby"))?.textContent === "Change password");
const pwInputs = [...document.querySelectorAll(".modal input[type='password']")];
check(`3 password fields (got ${pwInputs.length})`, pwInputs.length === 3);
check("submit disabled until valid",
  [...document.querySelectorAll(".modal button[type='submit']")].every((b) => b.disabled));
check("match hint area present", !!document.querySelector(".pw-match"));

// 9. Escape closes the modal
await pressKey("Escape");
check("Escape closes change-password modal", !document.querySelector(".modal"));

// 10. Dropdown closed too; sign-out path exists
check("dropdown closed after selection", !document.querySelector(".account-dropdown"));

// 11. SVG-only close button in the modal head (no glyph text)
await click(trigger);
await click([...document.querySelectorAll(".account-item")].find((b) => b.textContent.trim() === "Change password"));
const closeBtn = [...document.querySelectorAll(".modal .panel-head button")].find((b) => b.getAttribute("aria-label") === "Close");
check("modal close button is SVG with aria-label", !!closeBtn?.querySelector("svg"));
await click(closeBtn);
check("close button closes modal", !document.querySelector(".modal"));

console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
if (fails) {
  console.error(`\n${fails} FAIL(S)`);
  process.exitCode = 1;
} else {
  console.log(`\n${results.length}/${results.length} green`);
}
root.unmount();
