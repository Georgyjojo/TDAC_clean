import { apiClient } from "./apiClient";

// ---------------------------------------------------------------------------
// Laboratory test revisions (Results Entry + QA Approval)
// ---------------------------------------------------------------------------

export interface LabTestSummary {
  test_id: string;
  loca_id: string;
  samp_id: string;
  spec_ref: string | null;
  test_type: string;
  laboratory: string | null;
  technician: string | null;
  status: string;
  current_revision: number;
  created_at: string;
}

export interface LabValidationIssue {
  validation_issue_id: string;
  rule_code: string;
  severity: string;
  field_path: string | null;
  message: string;
  resolved: boolean;
}

export interface LabReviewEvent {
  event_type: string;
  from_status: string | null;
  to_status: string;
  actor: string;
  actor_role: string;
  reason: string | null;
  event_at: string;
}

/** One AGS publication record written by the publish (release) action. */
export interface LabPublicationRecord {
  ags_group: string;
  business_key: Record<string, unknown>;
  projected_row_count: number;
  projected_row_hash: string;
  projection_status: string;
  projected_at: string | null;
  projected_by: string | null;
}

export interface LabMethodPin {
  method_definition_id: string;
  method_code: string;
  method_version: number;
  method_name: string;
  standard_body: string | null;
  standard_reference: string | null;
  standard_edition: string | null;
  calculation_package: string;
  calculation_package_version: string;
}

export interface LabTestRevision {
  revision_no: number;
  raw_input_snapshot: Record<string, unknown>;
  calculation_output_snapshot: Record<string, unknown> | null;
  validation_snapshot: Record<string, unknown> | null;
  status: string;
  created_at: string;
  created_by: string;
}

export interface LabTestDetail {
  test_id: string;
  loca_id: string;
  sample_id: string;
  spec_ref: string | null;
  test_type: string;
  status: string;
  current_revision: number;
  row_version: number;
  method_definition_id: string;
  /** Method pinned on the registered test, read from lab.method_definition. */
  method: LabMethodPin | null;
  /** AGS groups the pinned method publishes into. */
  ags_groups: string[] | null;
  /** Released output keys the pinned method declares. */
  result_outputs: string[] | null;
  /** AGS publication records for the current revision (empty until published). */
  publication: LabPublicationRecord[];
  /** Real lab.review_event history for this test. */
  review_events: LabReviewEvent[];
  revision: LabTestRevision | null;
  validation_issues: LabValidationIssue[];
}

export interface LabRevisionPayload {
  raw_input_snapshot: Record<string, unknown>;
  calculation_output_snapshot?: Record<string, unknown> | null;
  validation_snapshot?: Record<string, unknown> | null;
  revision_reason?: string;
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? `Request failed: ${response.status}`);
  }
  return body;
}

/** All laboratory tests registered for a project. */
export async function getProjectLabTests(
  projectId: string
): Promise<LabTestSummary[]> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/lab/tests`
  );
  const body = await readJson(response);
  return body.tests;
}

/** One test plus its current revision snapshots and validation issues. */
export async function getLabTest(
  projectId: string,
  testId: string
): Promise<LabTestDetail> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/lab/tests/${encodeURIComponent(testId)}`
  );
  const body = await readJson(response);
  return body.test;
}

/** Persist the calculated draft for a test revision. */
export async function saveLabRevision(
  projectId: string,
  testId: string,
  payload: LabRevisionPayload
): Promise<LabTestDetail> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/lab/tests/${encodeURIComponent(testId)}/revision`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const body = await readJson(response);
  return body.test;
}

export type LabReviewAction =
  | "submit"
  | "check"
  | "approve"
  | "publish"
  | "return";

/** Advance a test through submit / check / approve / publish / return. */
export async function reviewLabTest(
  projectId: string,
  testId: string,
  action: LabReviewAction,
  reason?: string
): Promise<LabTestDetail> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/lab/tests/${encodeURIComponent(testId)}/${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason ?? null }),
    }
  );
  const body = await readJson(response);
  return body.test;
}

// Laboratory results (Historic Data tab)

export interface LabResultRow {
  test_id: string;
  proj_id: string;
  loca_id: string;
  sample_id: string;
  spec_ref: string | null;
  depth: number | null;
  test_type: string;
  laboratory: string | null;
  status: string;
  ll: number | null;
  pi: number | null;
  outputs: Record<string, number>;
}

export interface LabResultFilters {
  sample?: string;
  depth_from?: number;
  depth_to?: number;
  test_type?: string;
}

export async function getLabResults(
  projectId: string,
  filters: LabResultFilters = {}
): Promise<LabResultRow[]> {
  const params = new URLSearchParams();

  if (filters.sample && filters.sample.trim() !== "") {
    params.set("sample", filters.sample.trim());
  }

  if (filters.depth_from != null) {
    params.set("depth_from", String(filters.depth_from));
  }

  if (filters.depth_to != null) {
    params.set("depth_to", String(filters.depth_to));
  }

  if (filters.test_type && filters.test_type.trim() !== "") {
    params.set("test_type", filters.test_type.trim());
  }

  const query = params.toString();

  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/lab/results${query ? `?${query}` : ""}`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to load lab results: ${response.status}`
    );
  }

  const result = await response.json();
  return result.results;
}

// QA review queue (QA and Approval tab)

export interface LabReviewQueueRow {
  test_id: string;
  loca_id: string;
  sample_id: string;
  spec_ref: string | null;
  test_type: string;
  prepared_by: string | null;
  status: string;
  current_revision: number;
  has_revision: boolean;
  method_code: string | null;
  method_version: number | null;
  warnings: number;
  blockers: number;
}

export async function getReviewQueue(
  projectId: string
): Promise<LabReviewQueueRow[]> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/lab/review-queue`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to load review queue: ${response.status}`
    );
  }

  const result = await response.json();
  return result.queue;
}
