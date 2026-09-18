import { useEffect, useState } from "react";
import {
  getProjectSamples,
  createProjectLabTest,
  ProjectSample,
} from "../../../../api/fieldData";

interface TestRegisterTabProps {
  projectId: string;
}

export function TestRegisterTab({
  projectId,
}: TestRegisterTabProps) {
  const [samples, setSamples] = useState<ProjectSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSample, setSelectedSample] =
    useState<ProjectSample | null>(null);
    
const [specimenRef, setSpecimenRef] = useState("SPEC-01");
const [testType, setTestType] = useState("PSD");
const [methodDefinitionId] = useState(
  "00000000-0000-0000-0000-000000000001"
);
const [laboratory, setLaboratory] = useState("TDAC Laboratory");
const [technician, setTechnician] = useState("");
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function loadSamples() {
      try {
        setLoading(true);
        setError("");

        const data = await getProjectSamples(projectId);
        setSamples(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load project samples.");
      } finally {
        setLoading(false);
      }
    }

    loadSamples();
  }, [projectId]);

  if (loading) {
    return (
      <div className="card">
        <h3>Test Register</h3>
        <p className="page-sub">Loading project samples...</p>
      </div>
    );
  }

  async function handleCreateTest() {
    if (!selectedSample) return;

    try {
        setSaving(true);
        setSaveError("");

        await createProjectLabTest(projectId, {
        loca_id: selectedSample.loca_id,
        samp_id: selectedSample.sample_id,
        specimen_ref: specimenRef,
        test_type: testType,
        method_definition_id: methodDefinitionId,
        laboratory,
        technician: technician || undefined,
        });

        setSelectedSample(null);
    } catch (err) {
        console.error(err);

        setSaveError(
        err instanceof Error
            ? err.message
            : "Failed to create laboratory test."
        );
    } finally {
        setSaving(false);
    }
    }

  if (error) {
    return (
      <div className="card">
        <h3>Test Register</h3>
        <p className="page-sub">{error}</p>
      </div>
    );
  }

  if (selectedSample) {
    return (
      <div className="card">
        <div className="lab-overview-header">
          <div>
            <h3>Register Laboratory Test</h3>
            <p className="page-sub">
              Register a laboratory test for the selected sample.
            </p>
          </div>

          <button
            type="button"
            className="button-secondary"
            onClick={() => setSelectedSample(null)}
          >
            Back to Samples
          </button>
        </div>

        <div className="card">
          <h4>Selected Sample</h4>

          <div className="lab-overview-summary">
            <div>
              <div className="lab-summary-label">Sample ID</div>
              <div className="lab-summary-value">
                {selectedSample.sample_id}
              </div>
            </div>

            <div>
              <div className="lab-summary-label">Location / Borehole</div>
              <div className="lab-summary-value">
                {selectedSample.loca_id}
              </div>
            </div>

            <div>
              <div className="lab-summary-label">Depth From</div>
              <div className="lab-summary-value">
                {selectedSample.depth_from} m
              </div>
            </div>

            <div>
              <div className="lab-summary-label">Depth To</div>
              <div className="lab-summary-value">
                {selectedSample.depth_to ?? "—"} m
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h4>Test Details</h4>

          <div className="form-grid">
            <label>
                <span>Specimen Ref</span>
                <input
                type="text"
                value={specimenRef}
                onChange={(e) => setSpecimenRef(e.target.value)}
                />
            </label>

            <label>
                <span>Test Type</span>
                <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                >
                <option value="PSD">Particle Size Distribution</option>
                <option value="PARTICLE_DENSITY">Particle Density</option>
                <option value="ATTERBERG">Atterberg</option>
                <option value="SHRINKAGE_LIMIT">Shrinkage Limit</option>
                <option value="TRIAXIAL_UU">Triaxial UU</option>
                <option value="CONSOLIDATION">Consolidation</option>
                </select>
            </label>

            <label>
                <span>Laboratory</span>
                <input
                type="text"
                value={laboratory}
                onChange={(e) => setLaboratory(e.target.value)}
                />
            </label>

            <label>
                <span>Technician</span>
                <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                />
            </label>
        </div>
        {saveError && (
            <p className="page-sub">
                {saveError}
            </p>
            )}

            <div className="lab-overview-actions">
            <button
                type="button"
                className="button-primary"
                onClick={handleCreateTest}
                disabled={saving}
            >
                {saving ? "Saving..." : "Create Test"}
            </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Test Register</h3>

      <p className="page-sub">
        Select a sample to register a laboratory test.
      </p>

      {samples.length === 0 ? (
        <p className="page-sub">
          No samples are available for this project.
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Location / Borehole</th>
                <th>Depth From (m)</th>
                <th>Depth To (m)</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {samples.map((sample) => (
                <tr
                  key={`${sample.loca_id}-${sample.sample_id}`}
                >
                  <td>{sample.sample_id}</td>

                  <td>{sample.loca_id}</td>

                  <td>{sample.depth_from}</td>

                  <td>{sample.depth_to ?? "—"}</td>

                  <td>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setSelectedSample(sample)}
                    >
                      Register Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}