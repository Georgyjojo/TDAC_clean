import { apiClient } from "./apiClient";

export interface PortfolioProject {
  PROJ_ID: string | number;
  PROJ_NAME: string | null;
  PROJ_LOC: string | null;
}

export interface PortfolioSummary {
  total_projects: number;
  projects: PortfolioProject[];
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const response = await apiClient("/api/portfolio/summary", {
    method: "GET",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.detail || "Unable to load portfolio data"
    );
  }

  return response.json();
}

// =====================================================
// CREATE PROJECT
// =====================================================

export interface CreateProjectPayload {
  project_id: string;
  project_name: string;
  project_location: string;
  project_client: string;

  borehole_id: string;
  borehole_type: string;

  start_date: string;
  end_date: string;

  final_depth: number;
}

export async function createProject(
  data: CreateProjectPayload
) {
  const response = await apiClient("/api/projects", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.detail ||
      errorBody?.message ||
      `Failed to create project (${response.status})`
    );
  }

  return response.json();
}