import type { LocaRecord } from "../../../api/projects";
import { LocationSelector } from "./LocationSelector";
import { FieldDataModuleTabs } from "./FieldDataModuleTabs";
import { BoreholeModule } from "./BoreholeModule";
import { SptModule } from "./SptModule";
import { SamplingModule } from "./SamplingModule";
import { GroundwaterModule } from "./GroundwaterModule";

interface FieldDataProps {
  projectId: string | undefined;
  locas: LocaRecord[];
  selectedLocaId: string | null;
  loading: boolean;
  error: string | null;
  onSelectLoca: (locaId: string) => void;
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
}

export function FieldData({
  projectId,
  locas,
  selectedLocaId,
  loading,
  error,
  onSelectLoca,
  activeModule,
  onSelectModule,
}: FieldDataProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Field Data</h2>
      </div>

      <div className="panel-body">
        {loading && <p className="page-sub">Loading project locations…</p>}

        {!loading && error && <p className="page-sub field-error">{error}</p>}

        {!loading && !error && locas.length === 0 && (
          <div className="empty-state">
            <h3>No investigation locations</h3>
            <p>
              No investigation locations have been added to this project.
              Add one from the Overview tab to begin recording field data.
            </p>
          </div>
        )}

        {!loading && !error && locas.length > 0 && (
          <div className="field-layout">
            <LocationSelector
              locas={locas}
              selectedLocaId={selectedLocaId}
              onSelectLoca={onSelectLoca}
            />

            <div>
              <FieldDataModuleTabs
                activeModule={activeModule}
                onSelectModule={onSelectModule}
              />

              <div className="panel">
                <div className="panel-body">
                  {!selectedLocaId || !projectId ? (
                    <p className="page-sub">
                      Select an investigation location.
                    </p>
                  ) : activeModule === "drilling" ? (
                    <BoreholeModule
                      key={selectedLocaId}
                      projectId={projectId}
                      locaId={selectedLocaId}
                    />
                  ) : activeModule === "spt" ? (
                    <SptModule
                      key={selectedLocaId}
                      projectId={projectId}
                      locaId={selectedLocaId}
                    />
                  ) : activeModule === "sampling" ? (
                    <SamplingModule
                      key={selectedLocaId}
                      projectId={projectId}
                      locaId={selectedLocaId}
                    />
                  ) : (
                    <GroundwaterModule
                      key={selectedLocaId}
                      projectId={projectId}
                      locaId={selectedLocaId}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
