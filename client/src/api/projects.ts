import { apiClient } from "./apiClient";
export interface ProjectRecord {
  project_id: string;
  project_name: string;
  project_location: string;
  project_client: string;
}

export async function getProject(projectId: string): Promise<ProjectRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to load project: ${response.status}`);
  }

  return response.json();
}

export interface ProjectUpdate {
  project_name: string;
  project_location: string;
  project_client: string;
}

export async function updateProject(
  projectId: string,
  data: ProjectUpdate
): Promise<ProjectRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update project: ${response.status}`);
  }

  const result = await response.json();

  return result.project;
}

export interface LocaRecord {
  loca_id: string;
  loca_type: string;
  final_depth: number | null;
  start_date: string | null;
  end_date: string | null;
  project_id: string;
}

export async function getProjectLocas(
  projectId: string
): Promise<LocaRecord[]> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/locas`
  );

  if (!response.ok) {
    throw new Error(`Failed to load LOCAs: ${response.status}`);
  }

  const result = await response.json();

  return result.locas;
}

export interface LocaCreate{
  loca_id: string;
  loca_type: string;
  start_date: string | null;
  end_date: string | null;
  final_depth: number | null;
}

export async function createLoca(
  projectId: string,
  data: LocaCreate
): Promise<LocaRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(projectId)}/locas`,
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if(!response.ok){
    const errorBody = await response.json().catch(()=> null);
    throw new Error(
      errorBody?.detail ?? `Failed to create location: ${response.status}`
    );
  }

  const result = await response.json();
  return result.loca;
}