/** Latest entry point - Portfolio Management Centre (Company Home) */
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getPortfolioSummary,
  type PortfolioProject,
} from "../api/portfolio";

interface Project {
  number: string;
  name: string;
  client: string;
  location: string;
  stage: string;
  status: string;
  dataSummary: string;
}

interface Stat {
  label: string;
  value: string;
  chip: string;
  tone: string;
}

const STATUS_ROWS = [
  "In progress",
  "Pending Mobilization",
  "Delayed",
  "On Hold",
  "Completed",
  "Delivered",
];

export function PortfolioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalProjects, setTotalProjects] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        setError("");

        const data = await getPortfolioSummary();

        const mappedProjects: Project[] = data.projects.map(
          (project: PortfolioProject) => ({
            number: String(project.PROJ_ID),
            name: project.PROJ_NAME ?? "—",
            client: "—",
            location: project.PROJ_LOC ?? "—",
            stage: "—",
            status: "—",
            dataSummary: "—",
          })
        );

        setProjects(mappedProjects);
        setTotalProjects(data.total_projects);
      } catch (err) {
        console.error("Failed to load portfolio:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load portfolio data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPortfolio();
  }, []);

  const stats: Stat[] = [
    {
      label: "All Projects",
      value:
        totalProjects === null ? "—" : String(totalProjects),
      chip: "Searchable database",
      tone: "chip-info",
    },
    {
      label: "In Progress",
      value: "—",
      chip: "Active",
      tone: "chip-ok",
    },
    {
      label: "Pending / Delayed",
      value: "—",
      chip: "Attention",
      tone: "chip-warn",
    },
    {
      label: "Completed / Delivered",
      value: "—",
      chip: "Archive",
      tone: "chip-muted",
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <b>COMPANY HOME</b>
          </div>

          <h1 className="page-title">
            Portfolio Management Centre
          </h1>

          {user && (
            <p className="page-sub">
              Welcome, <b>{user.username}</b>. Role:{" "}
              <b>{user.role}</b>. User ID: <b>{user.id}</b>
            </p>
          )}

          <p className="page-sub">
            The company project register. Search any historical or
            active project, inspect status and data availability, or
            create a new project directly in the database.
          </p>
        </div>

        <div className="actions">
          <button type="button" className="btn">
            Import legacy registers
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/projects/new")}
          >
            + Add New Project
          </button>
        </div>
      </div>

      <div className="grid grid-4">
        {stats.map((s) => (
          <div className="panel metric" key={s.label}>
            <div className="panel-body">
              <small>{s.label}</small>

              <div className="metric-num">
                {s.value}
              </div>

              <span className={`chip ${s.tone}`}>
                {s.chip}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-23">
        <div className="panel">
          <div className="panel-head no-divider">
            <h3 className="panel-title">
              Project Register
            </h3>

            <div className="actions">
              <select
                className="btn"
                aria-label="Filter projects by status"
              >
                <option>All status</option>
                <option>In Progress</option>
                <option>Pending</option>
                <option>Delayed</option>
                <option>On Hold</option>
                <option>Completed</option>
                <option>Delivered</option>
              </select>

              <input
                className="search"
                placeholder="Search project no., name, place..."
                aria-label="Search projects"
              />
            </div>
          </div>

          <div className="panel-body table-scroll">
            <table className="dtable register-table">
              <thead>
                <tr>
                  <th>Project No.</th>
                  <th>Project / Client</th>
                  <th>Location</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="empty-row"
                    >
                      Loading project data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="empty-row"
                    >
                      {error}
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="empty-row"
                    >
                      No data available in the database.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.number}>
                      <td>
                        <b>{p.number}</b>
                      </td>

                      <td>
                        {p.name}
                        <br />
                        <small>{p.client}</small>
                      </td>

                      <td>{p.location}</td>

                      <td>{p.stage}</td>

                      <td>{p.status}</td>

                      <td>{p.dataSummary}</td>

                      <td></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head no-divider">
            <h3 className="panel-title">
              Portfolio Status
            </h3>
          </div>

          <div className="panel-body">
            <table className="stat-mini">
              <tbody>
                {STATUS_ROWS.map((r) => (
                  <tr key={r}>
                    <td>{r}</td>
                    <td>
                      <b>—</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="warning-note">
              Management rule: project status is derived from
              dates/workflow where possible; manual status changes
              require a reason.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}