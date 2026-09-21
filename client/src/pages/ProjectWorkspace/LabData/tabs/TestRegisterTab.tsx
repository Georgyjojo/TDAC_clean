import { useEffect, useState } from "react";
import {
  getProjectSamples,
  getProjectSampleTests,
  createProjectLabTest,
  type ProjectSample,
} from "../../../../api/fieldData";
import {
  getLabMethods,
  type LabMethod,
} from "../../../../api/labMethods";

interface TestRegisterTabProps {
  projectId: string;
}

export function TestRegisterTab({
  projectId,
}: TestRegisterTabProps) {
  const [samples, setSamples] = useState<ProjectSample[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const [selectedTestType, setSelectedTestType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSample, setSelectedSample] =
    useState<ProjectSample | null>(null);
  const [sampleTests, setSampleTests] = useState<any[]>([]);
  const [specimenRef, setSpecimenRef] = useState("SPEC-01");
  const [testType, setTestType] = useState("PSD");
  const [methods, setMethods] = useState<LabMethod[]>([]);
  // method_definition_id is required by POST /lab/tests and must match the
  // test type, so it is read from the real active method list - never a
  // hardcoded placeholder UUID.
  const [methodDefinitionId, setMethodDefinitionId] = useState("");
  const [laboratory, setLaboratory] = useState("TDAC Laboratory");
  const [technician, setTechnician] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    getLabMethods()
      .then(setMethods)
      .catch(() => setMethods([]));
  }, []);

  useEffect(() => {
  async function loadSamples() {
    try {
      setLoading(true);
      setError("");

      const [samplesData, sampleTestsData] = await Promise.all([
        getProjectSamples(projectId),
        getProjectSampleTests(projectId),
      ]);

      setSamples(samplesData);
      setSampleTests(sampleTestsData);
    } catch (err) {
      console.error(err);
      setError("Failed to load project samples.");
    } finally {
      setLoading(false);
    }
  }

  loadSamples();
  }, [projectId]);

  const locations = Array.from(
    new Set(samples.map((sample) => sample.loca_id))
  ).sort();

  const methodsForType = methods.filter(
    (method) => method.test_type === testType
  );

  // Falls back to the first active method for the chosen test type until the
  // user explicitly picks one, so creation never sends a stale/blank id.
  const effectiveMethodId =
    methodDefinitionId || methodsForType[0]?.method_definition_id || "";

  const filteredSamples = samples.filter((sample) => {
    const matchesLocation =
      selectedLocation === "ALL" ||
      sample.loca_id === selectedLocation;

    const sampleTestRows = sampleTests.filter(
  (test) =>
    test.sample_id === sample.sample_id &&
    test.loca_id === sample.loca_id
);

const hasTests = sampleTestRows.some(
  (test) => test.test_id !== null
);

const matchesTestType =
  selectedTestType === "ALL" ||
  sampleTestRows.some(
    (test) => test.test_type === selectedTestType
  ) ||
  (selectedTestType === "NOT_TESTED" && !hasTests);

const matchesStatus =
  selectedStatus === "ALL" ||
  sampleTestRows.some(
    (test) => test.status === selectedStatus
  ) ||
  (selectedStatus === "NOT_TESTED" && !hasTests);

    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const matchesSearch =
      normalizedSearch === "" ||
      sample.sample_id.toLowerCase().includes(normalizedSearch) ||
      sample.loca_id.toLowerCase().includes(normalizedSearch);

    return (
      matchesLocation &&
      matchesTestType &&
      matchesStatus &&
      matchesSearch
    );
  });

  const groupedSamples = filteredSamples.reduce<
    Record<string, ProjectSample[]>
  >((groups, sample) => {
    if (!groups[sample.loca_id]) {
      groups[sample.loca_id] = [];
    }

    groups[sample.loca_id].push(sample);

    return groups;
  }, {});

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

    if (!effectiveMethodId) {
        setSaveError(
        "No active laboratory method is available for this test type. " +
            "Add a method definition before registering the test."
        );
        return;
    }

    try {
        setSaving(true);
        setSaveError("");

        await createProjectLabTest(projectId, {
        loca_id: selectedSample.loca_id,
        samp_id: selectedSample.sample_id,
        specimen_ref: specimenRef,
        test_type: testType,
        method_definition_id: effectiveMethodId,
        laboratory,
        technician: technician || undefined,
        });

        setSelectedSample(null);

        // Reload so the newly registered test appears in the register.
        const refreshed = await getProjectSampleTests(projectId);
        setSampleTests(refreshed);
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
    <div className="lab-test-register">

      <div className="lab-test-register-header">
        <div className="lab-test-register-title">
          <div className="lab-test-register-title-icon">
            ⚗
          </div>

          <div>
            <h3>Register Laboratory Test</h3>
            <p>
              Register a laboratory test for the selected sample.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="lab-test-back-button"
          onClick={() => setSelectedSample(null)}
        >
          ← Back to Samples
        </button>
      </div>

      <div className="lab-selected-sample">

        <div className="lab-selected-sample-title">
          <div className="lab-selected-sample-title-icon">
            ▱
          </div>

          <h4>Selected Sample</h4>
        </div>

        <div className="lab-selected-sample-grid">

          <div className="lab-selected-sample-item">
            <div className="lab-selected-sample-label">
              Sample ID
            </div>

            <div className="lab-selected-sample-value">
              {selectedSample.sample_id}
            </div>
          </div>

          <div className="lab-selected-sample-item">
            <div className="lab-selected-sample-label">
              Location / Borehole
            </div>

            <div className="lab-selected-sample-value">
              {selectedSample.loca_id}
            </div>
          </div>

          <div className="lab-selected-sample-item">
            <div className="lab-selected-sample-label">
              Depth From
            </div>

            <div className="lab-selected-sample-value">
              {selectedSample.depth_from} m
            </div>
          </div>

          <div className="lab-selected-sample-item">
            <div className="lab-selected-sample-label">
              Depth To
            </div>

            <div className="lab-selected-sample-value">
              {selectedSample.depth_to ?? "—"} m
            </div>
          </div>

        </div>
      </div>

      <div className="lab-test-details">

        <div className="lab-test-details-header">
          <div className="lab-test-details-icon">
            ⚗
          </div>

          <div>
            <h4>Test Details</h4>
            <p>
              Enter the details for the laboratory test.
            </p>
          </div>
        </div>

        <div className="lab-test-form-grid">

          <div className="lab-test-form-field">
            <label>
              Specimen Ref
              <span className="lab-test-required">*</span>
            </label>

            <input
              type="text"
              value={specimenRef}
              onChange={(e) => setSpecimenRef(e.target.value)}
              placeholder="Enter specimen reference"
            />

            <div className="lab-test-form-help">
              Laboratory specimen reference for this test.
            </div>
          </div>

          <div className="lab-test-form-field">
            <label>
              Test Type
              <span className="lab-test-required">*</span>
            </label>

            <select
              value={testType}
              onChange={(e) => {
                const nextType = e.target.value;
                setTestType(nextType);
                const firstMethod = methods.find(
                  (method) => method.test_type === nextType
                );
                setMethodDefinitionId(
                  firstMethod ? firstMethod.method_definition_id : ""
                );
              }}
            >
              <option value="PSD">
                Particle Size Distribution
              </option>

              <option value="PARTICLE_DENSITY">
                Particle Density
              </option>

              <option value="ATTERBERG">
                Atterberg
              </option>

              <option value="SHRINKAGE_LIMIT">
                Shrinkage Limit
              </option>

              <option value="TRIAXIAL_UU">
                Triaxial UU
              </option>

              <option value="CONSOLIDATION">
                Consolidation
              </option>
            </select>

            <div className="lab-test-form-help">
              Select the laboratory test type.
            </div>
          </div>

          <div className="lab-test-form-field">
            <label>
              Method
              <span className="lab-test-required">*</span>
            </label>

            <select
              value={effectiveMethodId}
              onChange={(e) => setMethodDefinitionId(e.target.value)}
              disabled={methodsForType.length === 0}
            >
              {methodsForType.length === 0 ? (
                <option value="">
                  No active method for this test type
                </option>
              ) : (
                methodsForType.map((method) => (
                  <option
                    key={method.method_definition_id}
                    value={method.method_definition_id}
                  >
                    {method.method_code} · {method.method_name}
                    {method.standard_reference
                      ? ` (${method.standard_reference})`
                      : ""}
                  </option>
                ))
              )}
            </select>

            <div className="lab-test-form-help">
              Active method definition that owns the calculation package.
            </div>
          </div>

          <div className="lab-test-form-field">
            <label>
              Laboratory
              <span className="lab-test-required">*</span>
            </label>

            <input
              type="text"
              value={laboratory}
              onChange={(e) => setLaboratory(e.target.value)}
              placeholder="Enter laboratory name"
            />

            <div className="lab-test-form-help">
              Laboratory where the test will be performed.
            </div>
          </div>

          <div className="lab-test-form-field">
            <label>
              Technician
            </label>

            <input
              type="text"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              placeholder="Enter technician name"
            />

            <div className="lab-test-form-help">
              Name of the laboratory technician (optional).
            </div>
          </div>

        </div>

        {saveError && (
          <div className="lab-test-form-error">
            {saveError}
          </div>
        )}

        <div className="lab-test-form-actions">

          <button
            type="button"
            className="lab-test-create-button"
            onClick={handleCreateTest}
            disabled={saving}
          >
            +
            {saving ? "Saving..." : "Create Test"}
          </button>

          <button
            type="button"
            className="lab-test-cancel-button"
            onClick={() => setSelectedSample(null)}
          >
            × Cancel
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

      <div className="lab-register-filters">
        <label>
          <span>Location / Borehole</span>

          <select
            value={selectedLocation}
            onChange={(e) =>
              setSelectedLocation(e.target.value)
            }
          >
            <option value="ALL">All Locations</option>

            {locations.map((location) => (
              <option
                key={location}
                value={location}
              >
                {location}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Test Type</span>

          <select
            value={selectedTestType}
            onChange={(e) =>
              setSelectedTestType(e.target.value)
            }
          >
            <option value="ALL">All Test Types</option>
            <option value="PSD">Particle Size Distribution</option>
            <option value="PARTICLE_DENSITY">Particle Density</option>
            <option value="ATTERBERG">Atterberg</option>
            <option value="SHRINKAGE_LIMIT">Shrinkage Limit</option>
            <option value="TRIAXIAL_UU">Triaxial UU</option>
            <option value="CONSOLIDATION">Consolidation</option>
          </select>
        </label>

        <label>
          <span>Status</span>

          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value)
            }
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_TESTED">Not Tested</option>
            <option value="DRAFT">Draft</option>
            <option value="CALCULATED">In Progress</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="CHECKED">For Check</option>
            <option value="APPROVED">Approved</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>

        <label>
          <span>Search</span>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            placeholder="Sample ID or borehole..."
          />
        </label>
      </div>

      {filteredSamples.length === 0 ? (
      <div className="lab-sample-empty">
        <div className="lab-sample-empty-icon">⚗</div>

        <h4>No samples found</h4>

        <p>
          Try adjusting the location filter or select a
          different location.
        </p>
      </div>
      ) : (
          <div className="lab-sample-groups">
            {Object.entries(groupedSamples).map(
              ([location, locationSamples]) => (
                <div
                  key={location}
                  className="lab-sample-group"
                >
                  <div className="lab-sample-group-header">
                    <div>
                      <h4>{location}</h4>

                      <span>
                        {locationSamples.length} sample
                        {locationSamples.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Test ID</th>
                          <th>Location</th>
                          <th>Sample / Specimen</th>
                          <th>Depth</th>
                          <th>Test</th>
                          <th>Method</th>
                          <th>Revision</th>
                          <th>Status</th>
                          <th>AGS</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {locationSamples.map((sample) => {
                          const sampleTestRows = sampleTests.filter(
                            (test) =>
                              test.sample_id === sample.sample_id &&
                              test.loca_id === sample.loca_id
                          );

                          const test = sampleTestRows[0];

                          return (
                            <tr
                              key={`${sample.loca_id}-${sample.sample_id}`}
                            >
                              <td>
                                <strong>
                                  {test?.test_id ?? "—"}
                                </strong>
                              </td>

                              <td>
                                {sample.loca_id}
                              </td>

                              <td>
                                {sample.sample_id} / —
                              </td>

                              <td>
                                {sample.depth_from}–{sample.depth_to ?? "—"} m
                              </td>

                              <td>
                                {test?.test_type ?? "—"}
                              </td>

                              <td>
                                —
                              </td>

                              <td>
                                —
                              </td>

                              <td>
                                {test?.status ?? "NOT_TESTED"}
                              </td>

                              <td>
                                —
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="button-secondary"
                                  onClick={() =>
                                    setSelectedSample(sample)
                                  }
                                >
                                  {test ? "Open" : "Register Test"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}