/* Runtime smoke test: render the full App (untouched Home.tsx + AppShell),
   click "+ Add New Project", assert the modal opens with the 12 mockup fields
   and closes via Cancel / Escape / backdrop. */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;

const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const React = await import("react");
const { default: App } = await import("./src/App.tsx");

const root = createRoot(document.getElementById("root"));
await act(async () => {
  root.render(React.createElement(App));
});

const results = [];
const check = (name, cond) => results.push(`${cond ? "PASS" : "FAIL"} ${name}`);
const click = (el) => act(async () => {
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
});

// 1. Trigger button exists in the untouched Home page
const btn = [...document.querySelectorAll("button")].find(
  (b) => b.textContent.trim() === "+ Add New Project"
);
check("Add New Project button rendered (Home.tsx untouched)", !!btn);

// 2. Modal absent before click
check("modal closed before click", !document.querySelector(".modal-overlay"));

// 3. Click -> modal opens (delegated listener)
await click(btn);
let overlay = document.querySelector(".modal-overlay");
check("modal opens on click", !!overlay);
check("role=dialog + aria-modal",
  overlay?.getAttribute("role") === "dialog" && overlay?.getAttribute("aria-modal") === "true");
check("aria-labelledby resolves",
  document.getElementById(overlay?.getAttribute("aria-labelledby")) !== null);

// 4. Title + note per mockup V2
check("title text",
  document.querySelector(".modal-title")?.textContent === "Create Project Database Record");
check("eyebrow New project",
  document.querySelector(".modal-overlay .eyebrow")?.textContent.trim() === "New project");

// 5. Exactly 12 fields, labels match mockup order
const EXPECTED_LABELS = [
  "Project number","Project name","Client","Country / region",
  "Project type","Project status","Standards profile","AGS profile",
  "Unit profile","Coordinate system","Project manager","Organisation practice profile"
];
const fields = [...document.querySelectorAll(".modal-field label")].map((l) => l.textContent);
check(`12 fields rendered (got ${fields.length})`, fields.length === 12);
check("field labels + order match mockup", JSON.stringify(fields) === JSON.stringify(EXPECTED_LABELS));

// 6. Inputs/selects: counts, no mock values, mockup option lists
const inputs = [...overlay.querySelectorAll("input.modal-input")];
const selects = [...overlay.querySelectorAll("select.modal-input")];
check(`6 text inputs (got ${inputs.length})`, inputs.length === 6);
check(`6 selects (got ${selects.length})`, selects.length === 6);
check("all inputs blank (no mock data)", inputs.every((i) => i.value === ""));
const selByLabel = (label) =>
  [...selects].find((s) => s.previousElementSibling?.textContent === label);
const opts = (s) => [...s.options].map((o) => o.textContent).join("|");
check("Project type options",
  opts(selByLabel("Project type")) === "Building|Bridge|Road / Embankment|Port / Marine|Metro / Rail|Industrial|Other");
check("Project status options",
  opts(selByLabel("Project status")) === "Pending|In Progress|On Hold");
check("Standards profile options",
  opts(selByLabel("Standards profile")) === "India / IS + ISO|International / ISO|UK / BS + Eurocode|Custom");
check("AGS profile options",
  opts(selByLabel("AGS profile")) === "AGS 4.2|No AGS exchange required");
check("Unit profile options", opts(selByLabel("Unit profile")) === "SI");
check("Org practice options", opts(selByLabel("Organisation practice profile")) === "TDAC Standard v3");

// 7. Footer buttons + close button
const footBtns = [...overlay.querySelectorAll(".modal-actions button")].map((b) => b.textContent);
check("footer Cancel + Add Project to Database",
  JSON.stringify(footBtns) === JSON.stringify(["Cancel","Add Project to Database"]));
check("SVG close button with aria-label",
  overlay.querySelector("button[aria-label='Close dialog'] svg") !== null);

// 8. Cancel closes
await click([...overlay.querySelectorAll("button")].find((b) => b.textContent === "Cancel"));
check("Cancel closes modal", !document.querySelector(".modal-overlay"));

// 9. Escape closes
await click(btn);
await act(async () => {
  window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
});
check("Escape closes modal", !document.querySelector(".modal-overlay"));

// 10. Backdrop click closes
await click(btn);
const ov = document.querySelector(".modal-overlay");
await click(ov);
check("backdrop click closes modal", !document.querySelector(".modal-overlay"));

console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
root.unmount();
if (fails) process.exit(1);
