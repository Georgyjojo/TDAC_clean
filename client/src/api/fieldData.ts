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

export async function deleteBoreholeRecord(
  projectId: string,
  locaId: string,
  depthFrom: number
): Promise<void> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(
      locaId
    )}/field-data/borehole/${encodeURIComponent(depthFrom)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.detail ??
        `Failed to delete borehole record: ${response.status}`
    );
  }
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

export async function deleteSptRecord(
  projectId: string,
  locaId: string,
  sptDepth: number
): Promise<void> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(
      locaId
    )}/field-data/spt/${encodeURIComponent(sptDepth)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.detail ??
        `Failed to delete SPT record: ${response.status}`
    );
  }
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

export async function deleteSamplingRecord(
  projectId: string,
  locaId: string,
  depthFrom: number
): Promise<void> {
  const response = await apiClient(
    `/api/portfolio/projects/${encodeURIComponent(
      projectId
    )}/locas/${encodeURIComponent(
      locaId
    )}/field-data/sampling/${encodeURIComponent(depthFrom)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.detail ??
        `Failed to delete sampling record: ${response.status}`
    );
  }
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
    `/api/portfolio/projects/${projectId}/samples`
  );

  if (!response.ok) {
    throw new Error("Failed to load project samples.");
  }

  const data = await response.json();

  return data.samples;
}

export async function getProjectSampleTests(
  projectId: string
) {
  const response = await apiClient(
    `/api/portfolio/projects/${projectId}/sample-tests`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to load sample test information."
    );
  }

  return data.samples;
}

export async function createProjectLabTest(
  projectId: string,
  payload: {
    loca_id: string;
    samp_id: string;
    specimen_ref: string;
    test_type: string;
    method_definition_id: string;
    laboratory: string;
    technician?: string;
  }
) {
  const response = await apiClient(
    `/api/portfolio/projects/${projectId}/lab/tests`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to create laboratory test."
    );
  }

  return data;
}

export async function getProjectLabTests(
  projectId: string
) {
  const response = await apiClient(
    `/api/portfolio/projects/${projectId}/lab/tests`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to load laboratory tests."
    );
  }

  return data.tests;
}