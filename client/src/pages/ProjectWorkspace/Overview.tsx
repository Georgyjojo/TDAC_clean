import { useState } from "react";
import {
  updateProject,
  type LocaRecord,
  type ProjectRecord,
} from "../../api/projects";
import { AddLocaModal } from "./AddLocaModal";

interface OverviewProps {
  project: ProjectRecord | null;
  loading: boolean;
  error: string | null;
  projectId: string | undefined;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onProjectUpdated: (project: ProjectRecord) => void;
  addingLoca: boolean;
  onAddingLocaChange: (adding: boolean) => void;
  onLocaCreated: (loca: LocaRecord) => void;
}

export function Overview({
  project,
  loading,
  error,
  projectId,
  editing,
  onEditingChange,
  onProjectUpdated,
  addingLoca,
  onAddingLocaChange,
  onLocaCreated,
}: OverviewProps) {
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectClient, setProjectClient] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEditing() {
    if (!project) {
      return;
    }

    setProjectName(project.project_name);
    setProjectLocation(project.project_location);
    setProjectClient(project.project_client);

    setSaveError(null);
    onEditingChange(true);
  }

  function cancelEditing() {
    setSaveError(null);
    onEditingChange(false);
  }

  async function saveChanges() {
    if (!projectId) {
      setSaveError("No project ID was provided.");
      return;
    }

    if (!projectName.trim()) {
      setSaveError("Project name is required.");
      return;
    }

    if (!projectLocation.trim()) {
      setSaveError("Project location is required.");
      return;
    }

    if (!projectClient.trim()) {
      setSaveError("Project client is required.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const updatedProject = await updateProject(projectId, {
        project_name: projectName.trim(),
        project_location: projectLocation.trim(),
        project_client: projectClient.trim(),
      });

      onProjectUpdated(updatedProject);
      onEditingChange(false);
    } catch (error) {
      console.error("Failed to update project:", error);
      setSaveError("Unable to save project changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Project Information</h2>

        {!loading && !error && project && !editing && (
          <button type="button" className="btn" onClick={startEditing}>
            Edit Project
          </button>
        )}
      </div>

      <div className="panel-body">
        {loading && <p className="page-sub">Loading project information…</p>}

        {!loading && error && <p className="page-sub">{error}</p>}

        {!loading && !error && project && !editing && (
          <div className="viewgrid">
            <div className="panel">
              <div className="panel-body">
                <div className="eyebrow">PROJECT ID</div>
                <div>{project.project_id}</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-body">
                <div className="eyebrow">PROJECT NAME</div>
                <div>{project.project_name}</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-body">
                <div className="eyebrow">LOCATION</div>
                <div>{project.project_location || "—"}</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-body">
                <div className="eyebrow">CLIENT</div>
                <div>{project.project_client || "—"}</div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && project && editing && (
          <div>
            <div className="form-grid">
              <label>
                <span className="eyebrow">PROJECT ID</span>
                <input
                  className="modal-input"
                  type="text"
                  value={project.project_id}
                  disabled
                />
              </label>

              <label>
                <span className="eyebrow">PROJECT NAME</span>
                <input
                  className="modal-input"
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
              </label>

              <label>
                <span className="eyebrow">LOCATION</span>
                <input
                  className="modal-input"
                  type="text"
                  value={projectLocation}
                  onChange={(event) => setProjectLocation(event.target.value)}
                />
              </label>

              <label>
                <span className="eyebrow">CLIENT</span>
                <input
                  className="modal-input"
                  type="text"
                  value={projectClient}
                  onChange={(event) => setProjectClient(event.target.value)}
                />
              </label>
            </div>

            {saveError && <p className="page-sub">{saveError}</p>}

            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={saveChanges}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && !project && (
          <p className="page-sub">Project information is unavailable.</p>
        )}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Investigation Locations</h2>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onAddingLocaChange(true)}
          >
            + Add Location
          </button>
        </div>
        <div className="panel-body">
          <p className="page-sub">
            Add and manage investigation locations associated with this
            project.
          </p>
        </div>
      </section>

      {addingLoca && (
        <AddLocaModal
          projectId={projectId}
          onClose={() => onAddingLocaChange(false)}
          onCreated={onLocaCreated}
        />
      )}
    </section>
  );
}
