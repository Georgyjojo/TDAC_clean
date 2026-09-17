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

export interface CreateProjectMetadata {
  road_reference?: string | null;
  chainage_text?: string | null;
  structure_reference?: string | null;
  selected_boreholes?: string | null;

  report_type?: string | null;
  report_title?: string | null;
  report_volume_title?: string | null;
  document_reference?: string | null;
  revision?: string | null;
  report_date?: string | null;
  issue_status?: string | null;

  tdac_company_name?: string | null;
  groundwater_basis?: string | null;

  design_standard_basis?: string | null;
  factor_of_safety_basis?: string | null;
  load_combination_basis?: string | null;
  construction_verification_requirement?: string | null;
  pile_load_test_requirement?: string | null;
}

export interface CreateProjectPayload {
  project_id: string;
  project_name: string;
  project_location: string;
  project_client: string;
  consultant_name: string;
  contractor_name: string;

  metadata?: CreateProjectMetadata | null;
}

export async function createProject(
  data: CreateProjectPayload
) {
  const response = await apiClient("/api/portfolio/projects", {
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

export async function getNextProjectId(): Promise<string> {
  const response = await apiClient("/api/portfolio/projects/next-id", {
    method: "GET",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.detail ||
        errorBody?.message ||
        `Failed to generate project ID (${response.status})`
    );
  }

  const data = await response.json();

  return data.project_id;
}