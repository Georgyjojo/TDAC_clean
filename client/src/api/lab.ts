import { apiClient } from "./apiClient";

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
  ll: number | null;
  pi: number | null;
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
  test_type: string;
  sample_id: string;
  prepared_by: string | null;
  status: string;
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
