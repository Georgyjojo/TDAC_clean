/**
 * Dedicated Results Entry API layer (isolated from shared fieldData.ts).
 *
 * BACKEND STATUS: the server only exposes
 *   POST/GET /api/portfolio/projects/{id}/lab/tests   (test identity records)
 * There is NO endpoint for raw readings, calculated values, revisions,
 * submit-for-check or release. Until those exist, drafts are stored ONLY in
 * this browser (localStorage) and are reported to the user as such.
 */
import { getProjectSamples, type ProjectSample } from "./fieldData";

export { getProjectSamples };
export type { ProjectSample };

export interface DraftRecord {
  revision: number;
  savedAt: string;
  payload: unknown;
}

const key = (projectId: string, test: string) =>
  `tdac.labResultsDraft.${projectId}.${test}`;

/** Browser-local draft. NOT a server save. */
export function saveLocalDraft(
  projectId: string,
  test: string,
  payload: unknown,
  revision: number
): DraftRecord {
  const rec: DraftRecord = {
    revision,
    savedAt: new Date().toISOString(),
    payload,
  };
  localStorage.setItem(key(projectId, test), JSON.stringify(rec));
  return rec;
}

export function loadLocalDraft(
  projectId: string,
  test: string
): DraftRecord | null {
  try {
    const raw = localStorage.getItem(key(projectId, test));
    return raw ? (JSON.parse(raw) as DraftRecord) : null;
  } catch {
    return null;
  }
}

/** Server-side functions that do not exist yet. */
export const BACKEND_PENDING = [
  "Persist raw readings per test/revision",
  "Persist calculated values separately from raw readings",
  "Submit for check / status transitions",
  "Approved-revision lock + new-revision creation",
  "Audit trail read/write",
  "AGS projection storage",
  "Method-definition list (method_definition_id is required by POST lab/tests)",
] as const;
