import { apiClient } from "./apiClient";

/**
 * Excel import API. Mirrors app/excel_router.py.
 *
 * One shared parse endpoint turns any input-sheet variant into the form
 * suggestions plus the raw workbook; the parsed workbook travels back
 * inside the commit body so the browser never uploads file bytes twice.
 */

export interface ProjectInfoData {
  project_type: string | null;
  project_location: string | null;
  client_name: string | null;
  borehole_number: string | null;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  final_depth: number | null;
}

export interface BorelogRow {
  depth_from: number;
  depth_to: number;
  soil_description: string | null;
  sand_clay: string | null;
}

export interface RockProfileRow {
  depth_from: number;
  depth_to: number;
  rock_description: string | null;
  recovery: number | null;
  rqd: number | null;
  remark: string | null;
}

export interface SPTImportRow {
  spt_depth: number;
  blows_15: number | null;
  blows_30: number | null;
  blows_45: number | null;
  n_value: number | null;
}

export interface ImportedWorkbook {
  project_info: ProjectInfoData;
  borelog: BorelogRow[];
  rock_profile: RockProfileRow[];
  spt: SPTImportRow[];
}

export interface ImportSuggestions {
  project_name: string | null;
  project_location: string | null;
  project_client: string | null;
  borehole_id: string | null;
  start_date: string | null;
  end_date: string | null;
  final_depth: number | null;
}

export interface ParsedWorkbookResponse {
  workbook: ImportedWorkbook;
  suggestions: ImportSuggestions;
}

export async function parseExcelWorkbook(
  file: File
): Promise<ParsedWorkbookResponse> {
  const body = new FormData();
  body.append("file", file);

  const response = await apiClient("/api/excel/workbook", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.detail ?? "Unable to read this workbook.");
  }

  return response.json();
}

export interface ProjectExcelImportPayload {
  project_id: string;
  project_name: string;
  project_location?: string | null;
  project_client?: string | null;
  borehole_id?: string | null;
  borehole_type: string;
  start_date?: string | null;
  end_date?: string | null;
  final_depth?: number | null;
  workbook: ImportedWorkbook;
}

export interface ImportResult {
  message: string;
  project_id: string;
  borehole_id: string;
  geol_rows: number;
  core_rows: number;
  spt_rows: number;
}

export async function createProjectFromExcel(
  payload: ProjectExcelImportPayload
): Promise<ImportResult> {
  const response = await apiClient("/api/excel/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? "Unable to import this workbook."
    );
  }

  return response.json();
}

export async function createLocaFromExcel(
  projectId: string,
  payload: { borehole_type: string; workbook: ImportedWorkbook }
): Promise<ImportResult> {
  const response = await apiClient(
    `/api/excel/projects/${encodeURIComponent(projectId)}/locas`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? "Unable to import this workbook."
    );
  }

  return response.json();
}
