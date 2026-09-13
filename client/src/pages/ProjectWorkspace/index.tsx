import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getProject,
  getProjectLocas,
  type LocaRecord,
  type ProjectRecord,
} from "../../api/projects";
import { WORKSPACE_TABS, getTabLabel } from "./types";
import { Overview } from "./Overview";
import { FieldData } from "./FieldData";
import { LabData } from "./LabData";
import { ProcessedData } from "./ProcessedData";
import { InterpretationGroundModel } from "./InterpretationGroundModel";
import { DesignParameters } from "./DesignParameters";
import { Design } from "./Design";
import { Reports } from "./Reports";
import { PlaceholderPanel } from "./PlaceholderPanel";

export function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState(false);

  const [locas, setLocas] = useState<LocaRecord[]>([]);
  const [selectedLocaId, setSelectedLocaId] = useState<string | null>(null);
  const [locasLoading, setLocasLoading] = useState(false);
  const [locasError, setLocasError] = useState<string | null>(null);

  const [activeFieldModule, setActiveFieldModule] = useState("drilling");
  const [addingLoca, setAddingLoca] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProjectLoading(false);
      setProjectError("No project ID was provided.");
      return;
    }

    const id = projectId;

    async function loadProject() {
      try {
        setProjectLoading(true);
        setProjectError(null);

        const data = await getProject(id);
        setProject(data);
      } catch (error) {
        console.error("Failed to load project:", error);
        setProjectError("Unable to load project.");
      } finally {
        setProjectLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  // Re-fetches the location list; the reload key lets the effect-driven
  // loader and the post-import refresh share one path without
  // duplicating the fetch in multiple callbacks.
  const [locasReloadKey, setLocasReloadKey] = useState(0);

  function loadLocasAgain() {
    setLocasReloadKey((key) => key + 1);
  }

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const id = projectId;

    async function loadLocas() {
      try {
        setLocasLoading(true);
        setLocasError(null);

        const data = await getProjectLocas(id);
        setLocas(data);

        setSelectedLocaId((current) => {
          if (current && data.some((loca) => loca.loca_id === current)) {
            return current;
          }

          return data.length > 0 ? data[0].loca_id : null;
        });
      } catch (error) {
        console.error("Failed to load LOCAs:", error);
        setLocasError("Unable to load project locations.");
      } finally {
        setLocasLoading(false);
      }
    }

    loadLocas();
  }, [projectId, locasReloadKey]);

  // Called after a new location is created from the Overview tab so the
  // Field Data location list is available immediately, without an
  // unrelated page refresh.
  function handleLocaCreated(newLoca: LocaRecord) {
    setLocas((current) => [...current, newLoca].sort((a, b) =>
      a.loca_id.localeCompare(b.loca_id)
    ));
    setSelectedLocaId(newLoca.loca_id);
  }

  return (
    <>
      {/* Project header */}
      <div className="projectbar">
        <div>
          <div className="eyebrow">PROJECT WORKSPACE</div>

          <h1 className="projectbar-title">
            {projectLoading
              ? "Loading…"
              : project?.project_name ?? projectId ?? "—"}
          </h1>

          <div className="projectbar-meta">
            {projectLoading
              ? "Loading project details…"
              : projectError
              ? projectError
              : `${project?.project_id ?? "—"} · ${
                  project?.project_client || "No client"
                } · ${project?.project_location || "No location"}`}
          </div>
        </div>

        <div className="actions">
          <button type="button" className="btn">
            Attachments
          </button>

          <button type="button" className="btn">
            QA / Issues
          </button>
        </div>
      </div>

      {/* Main workspace navigation */}
      <nav className="tabs" role="tablist" aria-label="Project workspace sections">
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Active workspace module */}
      {activeTab === "overview" ? (
        <Overview
          project={project}
          loading={projectLoading}
          error={projectError}
          projectId={projectId}
          editing={editingProject}
          onEditingChange={setEditingProject}
          onProjectUpdated={setProject}
          addingLoca={addingLoca}
          onAddingLocaChange={setAddingLoca}
          onLocaCreated={handleLocaCreated}
          onLocasImported={loadLocasAgain}
        />
      ) : activeTab === "field" ? (
        <FieldData
          projectId={projectId}
          locas={locas}
          selectedLocaId={selectedLocaId}
          loading={locasLoading}
          error={locasError}
          onSelectLoca={setSelectedLocaId}
          activeModule={activeFieldModule}
          onSelectModule={setActiveFieldModule}
        />
      ) : activeTab === "lab" ? (
        <LabData />
      ) : activeTab === "processed" ? (
        <ProcessedData />
      ) : activeTab === "interpretation" ? (
        <InterpretationGroundModel />
      ) : activeTab === "parameters" ? (
        <DesignParameters />
      ) : activeTab === "design" ? (
        <Design />
      ) : activeTab === "reports" ? (
        <Reports />
      ) : (
        <PlaceholderPanel title={getTabLabel(activeTab)} />
      )}
    </>
  );
}
