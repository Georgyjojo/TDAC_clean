import { apiClient } from "./apiClient";

// ---------------------------------------------------------------------------
// Borehole / Drilling
// ---------------------------------------------------------------------------

export interface BoreholeRecord {
  depth_from: number;
  depth_to: number | null;
  soil_description: string | null;
  sand_clay: string | null;
  avg_n_value: number | null;
}

export interface BoreholeUpdate {
  depth_from: number;
  depth_to: number | null;
  soil_description: string | null;
  sand_clay: string | null;
}

export interface BoreholeCreate {
  depth_from: number;
  depth_to: number | null;
  soil_description: string | null;
  sand_clay: string | null;
}

export async function getBoreholeRecords(
  projectId: string,
  locaId: string
): Promise<BoreholeRecord[]> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(locaId)}/field-data/borehole`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to load borehole data: ${response.status}`
    );
  }

  const result = await response.json();
  return result.records;
}

export async function updateBoreholeRecord(
  projectId: string,
  locaId: string,
  originalDepthFrom: number,
  data: BoreholeUpdate
): Promise<BoreholeRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(
      locaId
    )}/field-data/borehole/${encodeURIComponent(originalDepthFrom)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to update borehole record: ${response.status}`
    );
  }

  const result = await response.json();
  return result.record;
}

export async function createBoreholeRecord(
  projectId: string,
  locaId: string,
  data: BoreholeCreate
): Promise<BoreholeRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(locaId)}/field-data/borehole`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to create borehole record: ${response.status}`
    );
  }

  const result = await response.json();
  return result.record;
}

// ---------------------------------------------------------------------------
// SPT
// ---------------------------------------------------------------------------

export interface SptRecord {
  spt_depth: number;
  blows_15: number | null;
  blows_30: number | null;
  blows_45: number | null;
  n_value: number | null;
}

export interface SptUpdate {
  spt_depth: number;
  blows_15: number | null;
  blows_30: number | null;
  blows_45: number | null;
  n_value: number | null;
}

export interface SptCreate {
  spt_depth: number;
  blows_15: number | null;
  blows_30: number | null;
  blows_45: number | null;
  n_value: number | null;
}

export async function getSptRecords(
  projectId: string,
  locaId: string
): Promise<SptRecord[]> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(locaId)}/field-data/spt`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to load SPT data: ${response.status}`
    );
  }

  const result = await response.json();
  return result.records;
}

export async function updateSptRecord(
  projectId: string,
  locaId: string,
  originalSptDepth: number,
  data: SptUpdate
): Promise<SptRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(
      locaId
    )}/field-data/spt/${encodeURIComponent(originalSptDepth)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to update SPT record: ${response.status}`
    );
  }

  const result = await response.json();
  return result.record;
}

export async function createSptRecord(
  projectId: string,
  locaId: string,
  data: SptCreate
): Promise<SptRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(locaId)}/field-data/spt`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to create SPT record: ${response.status}`
    );
  }

  const result = await response.json();
  return result.record;
}

// ---------------------------------------------------------------------------
// Sampling / Coring
// ---------------------------------------------------------------------------

export interface SamplingRecord {
  sample_id: string;
  depth_from: number;
  depth_to: number | null;
  rock_description: string | null;
  recovery: number | null;
  rqd: number | null;
  remark: string | null;
}

export interface SamplingUpdate {
  depth_from: number;
  depth_to: number | null;
  rock_description: string | null;
  recovery: number | null;
  rqd: number | null;
  remark: string | null;
}

// rock_description is intentionally omitted: CORE has no column for it —
// it is only ever sourced from an overlapping GEOL interval, which a
// brand-new sample run will not yet have.
export interface SamplingCreate {
  depth_from: number;
  depth_to: number | null;
  recovery: number | null;
  rqd: number | null;
  remark: string | null;
}

export async function getSamplingRecords(
  projectId: string,
  locaId: string
): Promise<SamplingRecord[]> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(locaId)}/field-data/sampling`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to load sampling data: ${response.status}`
    );
  }

  const result = await response.json();
  return result.records;
}

export async function updateSamplingRecord(
  projectId: string,
  locaId: string,
  originalDepthFrom: number,
  data: SamplingUpdate
): Promise<SamplingRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(
      locaId
    )}/field-data/sampling/${encodeURIComponent(originalDepthFrom)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to update sampling record: ${response.status}`
    );
  }

  const result = await response.json();
  return result.record;
}

export async function createSamplingRecord(
  projectId: string,
  locaId: string,
  data: SamplingCreate
): Promise<SamplingRecord> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(locaId)}/field-data/sampling`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to create sampling/coring record: ${response.status}`
    );
  }

  const result = await response.json();
  return result.record;
}

// ---------------------------------------------------------------------------
// Groundwater
// ---------------------------------------------------------------------------

export interface GroundwaterResponse {
  available: boolean;
  reason: string | null;
  records: unknown[];
}

export async function getGroundwaterStatus(
  projectId: string,
  locaId: string
): Promise<GroundwaterResponse> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(locaId)}/field-data/groundwater`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail ?? `Failed to load groundwater data: ${response.status}`
    );
  }

  return response.json();
}

export interface ProjectSample {
  sample_id: string;
  loca_id: string;
  depth_from: number;
  depth_to: number | null;
}

export async function getProjectSamples(
  projectId: string
): Promise<ProjectSample[]> {
  const response = await apiClient(
    `/portfolio/projects/${projectId}/samples`
  );

  if (!response.ok) {
    throw new Error("Failed to load project samples.");
  }

  const data = await response.json();

  return data.samples;
}