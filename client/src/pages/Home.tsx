/** Latest entry point - Portfolio Management Centre (Company Home) */
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
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
  locas: number;
  samples: number;
  tests: number;
  published: number;
}

interface Stat {
  label: string;
  value: string;
  chip: string;
  tone: string;
}

const NOT_SET = "Not set";

const STAGE_LABELS: Record<string, string> = {
  LAB_ONLY: "Lab Only",
  REPORT_ONLY: "Report Only",
  LAB_AND_REPORT: "Lab + Report",
};

const ISSUE_STATUSES = [
  "Draft",
  "For Review",
  "Client Issue",
  "Final",
  "Superseded",
];

const ALL_STATUS = "All status";

function stageText(value: string | null): string {
  if (!value) return NOT_SET;

  return STAGE_LABELS[value] ?? value;
}

function dataText(project: Project): string {
  if (
    project.locas === 0 &&
    project.samples === 0 &&
    project.tests === 0
  ) {
    return "No data";
  }

  const parts = [
    `${project.locas} loca`,
    `${project.samples} samp`,
    `${project.tests} tests`,
  ];

  if (project.published > 0) {
    parts.push(`${project.published} published`);
  }

  return parts.join(" / ");
}

function matchesQuery(project: Project, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) return true;

  return [
    project.number,
    project.name,
    project.client,
    project.location,
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function PortfolioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalProjects, setTotalProjects] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        setError("");

        const data = await getPortfolioSummary();

        const mappedProjects: Project[] = data.projects.map(
          (project: PortfolioProject) => ({
            number: String(project.PROJ_ID),
            name: project.PROJ_NAME ?? NOT_SET,
            client: project.PROJ_CLNT ?? NOT_SET,
            location: project.PROJ_LOC ?? NOT_SET,
            stage: stageText(project.PROJECT_TYPE),
            status: project.ISSUE_STATUS ?? NOT_SET,
            locas: project.LOCA_COUNT ?? 0,
            samples: project.SAMP_COUNT ?? 0,
            tests: project.TEST_COUNT ?? 0,
            published: project.PUBLISHED_COUNT ?? 0,
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

  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          matchesQuery(project, query) &&
          (statusFilter === ALL_STATUS ||
            project.status === statusFilter)
      ),
    [projects, query, statusFilter]
  );

  const stats: Stat[] = [
    {
      label: "All Projects",
      value: String(totalProjects ?? projects.length),
      chip: "Searchable database",
      tone: "chip-info",
    },
    {
      label: "With Field Data",
      value: String(projects.filter((p) => p.locas > 0).length),
      chip: "Locations logged",
      tone: "chip-ok",
    },
    {
      label: "With Lab Tests",
      value: String(projects.filter((p) => p.tests > 0).length),
      chip: "Tests logged",
      tone: "chip-warn",
    },
    {
      label: "Issued",
      value: String(
        projects.filter(
          (p) => p.status === "Final" || p.status === "Client Issue"
        ).length
      ),
      chip: "Final or client issue",
      tone: "chip-muted",
    },
  ];

  const statusCounts = [...ISSUE_STATUSES, NOT_SET].map((status) => ({
    status,
    count: projects.filter((project) => project.status === status)
      .length,
  }));

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
              <span className="chip chip-muted">
                {visibleProjects.length} of {projects.length}
              </span>

              <select
                className="btn"
                aria-label="Filter projects by status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value={ALL_STATUS}>All status</option>

                {ISSUE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}

                <option value={NOT_SET}>{NOT_SET}</option>
              </select>

              <div className="search">
                <input
                  type="search"
                  placeholder="Search project no., name, place..."
                  aria-label="Search projects"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
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
                ) : visibleProjects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="empty-row"
                    >
                      No project matches this search or status
                      filter.
                    </td>
                  </tr>
                ) : (
                  visibleProjects.map((p) => (
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

                      <td>{dataText(p)}</td>

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
                {statusCounts.map((row) => (
                  <tr key={row.status}>
                    <td>{row.status}</td>
                    <td>
                      <b>{row.count}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="warning-note">
              Status is the issue status recorded against each
              project. Set it when the project is created and change
              it from the project overview.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
