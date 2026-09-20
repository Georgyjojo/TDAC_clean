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

export async function getLabResults(
  projectId: string
): Promise<LabResultRow[]> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/lab/results`
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
