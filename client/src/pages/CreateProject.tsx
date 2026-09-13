import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  type CreateProjectPayload,
} from "../api/portfolio";
import {
  createProjectFromExcel,
  type ImportedWorkbook,
} from "../api/excelImport";
import { ExcelFilePicker } from "../components/ExcelFilePicker";

export function CreateProjectPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    project_id: "",
    project_name: "",
    project_location: "",
    project_client: "",
    borehole_id: "",
    borehole_type: "",
    start_date: "",
    end_date: "",
    final_depth: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importedWorkbook, setImportedWorkbook] =
    useState<ImportedWorkbook | null>(null);

  function handleExcelParsed(
    workbook: ImportedWorkbook,
    suggestions: {
      project_name: string | null;
      project_location: string | null;
      project_client: string | null;
      borehole_id: string | null;
      start_date: string | null;
      end_date: string | null;
      final_depth: number | null;
    }
  ) {
    setImportedWorkbook(workbook);

    // Fill only empty fields; anything the user already typed wins.
    setForm((current) => ({
      ...current,
      project_name: current.project_name || suggestions.project_name || "",
      project_location:
        current.project_location || suggestions.project_location || "",
      project_client: current.project_client || suggestions.project_client || "",
      borehole_id: current.borehole_id || suggestions.borehole_id || "",
      start_date: current.start_date || suggestions.start_date || "",
      end_date: current.end_date || suggestions.end_date || "",
      final_depth:
        current.final_depth ||
        (suggestions.final_depth !== null
          ? String(suggestions.final_depth)
          : ""),
    }));
  }

  function handleExcelCleared() {
    // Removing the file returns the page to the plain manual flow;
    // typed values stay untouched.
    setImportedWorkbook(null);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    // The workbook's ProjectInfo sheet supplies fallbacks for fields the
    // user left empty, so validation and the commit both run on the
    // effective (form || sheet) values.
    const info = importedWorkbook?.project_info ?? null;

    const effectiveName =
      form.project_name.trim() || info?.project_type || "";
    const effectiveStart =
      form.start_date || info?.start_date || "";
    const effectiveEnd =
      form.end_date || info?.end_date || "";
    const effectiveDepth = form.final_depth
      ? Number(form.final_depth)
      : info?.final_depth ?? null;

    if (!form.project_id.trim()) {
      setError("Project ID is required.");
      return;
    }

    if (!effectiveName) {
      setError("Project name is required.");
      return;
    }

    if (
      effectiveStart &&
      effectiveEnd &&
      effectiveEnd < effectiveStart
    ) {
      setError(
        "Drilling end date cannot be before start date."
      );
      return;
    }

    if (effectiveDepth !== null && effectiveDepth <= 0) {
      setError("Final depth must be greater than 0.");
      return;
    }

    setLoading(true);

    try {
      if (importedWorkbook) {
        // Workbook path: one commit creates the project, its first
        // borehole, and every Borelog / Rock / SPT row. Empty form
        // fields fall back to the sheet values on the server.
        await createProjectFromExcel({
          project_id: form.project_id.trim(),
          project_name: effectiveName,
          project_location:
            form.project_location.trim() || null,
          project_client: form.project_client.trim() || null,
          borehole_id: form.borehole_id.trim() || null,
          borehole_type: form.borehole_type.trim() || "BH",
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          final_depth:
            form.final_depth !== "" ? Number(form.final_depth) : null,
          workbook: importedWorkbook,
        });
      } else {
        const data: CreateProjectPayload = {
          project_id: form.project_id.trim(),
          project_name: form.project_name.trim(),
          project_location: form.project_location.trim(),
          project_client: form.project_client.trim(),
          borehole_id: form.borehole_id.trim(),
          borehole_type: form.borehole_type.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
          final_depth: Number(form.final_depth),
        };

        await createProject(data);
      }

      navigate("/");
    } catch (err) {
      console.error("Failed to create project:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create project."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            Add New Project
          </h1>

          <p className="page-sub">
            Create a new project and its initial borehole.
          </p>
        </div>

        <div className="page-head-actions">
          <ExcelFilePicker
            onParsed={handleExcelParsed}
            onError={setError}
            onCleared={handleExcelCleared}
            disabled={loading}
          />

          <button
            type="button"
            className="btn"
            onClick={() => navigate("/")}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>

      {importedWorkbook && (
        <div className="import-note" role="status">
          <div>
            <b>Workbook loaded.</b> Its Borelog, Rock profile, and SPT
            rows will be imported with the project.{" "}
            {importedWorkbook.borelog.length} borelog,{" "}
            {importedWorkbook.rock_profile.length} rock profile,{" "}
            {importedWorkbook.spt.length} SPT row
            {importedWorkbook.spt.length === 1 ? "" : "s"} detected. Check
            the prefilled values and press Create Project.
          </div>
        </div>
      )}

      {error && (
        <div className="warning-note">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Project Details */}
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">
              Project Details
            </h2>
          </div>

          <div className="panel-body">
            <div className="grid grid-2">
              <div className="form-field">
                <label htmlFor="project_id">
                  Project ID
                </label>

                <input
                  id="project_id"
                  name="project_id"
                  type="number"
                  value={form.project_id}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="project_name">
                  Project Name
                </label>

                <input
                  id="project_name"
                  name="project_name"
                  type="text"
                  value={form.project_name}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>

              <div className="form-field">
                <label htmlFor="project_location">
                  Project Location
                </label>

                <input
                  id="project_location"
                  name="project_location"
                  type="text"
                  value={form.project_location}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>

              <div className="form-field">
                <label htmlFor="project_client">
                  Client Name
                </label>

                <input
                  id="project_client"
                  name="project_client"
                  type="text"
                  value={form.project_client}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Initial Borehole */}
        <div
          className="panel"
          style={{ marginTop: "13px" }}
        >
          <div className="panel-head">
            <h2 className="panel-title">
              Initial Borehole
            </h2>
          </div>

          <div className="panel-body">
            <div className="grid grid-2">
              <div className="form-field">
                <label htmlFor="borehole_id">
                  Borehole ID
                </label>

                <input
                  id="borehole_id"
                  name="borehole_id"
                  type="text"
                  value={form.borehole_id}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>

              <div className="form-field">
                <label htmlFor="borehole_type">
                  Borehole Type
                </label>

                <input
                  id="borehole_type"
                  name="borehole_type"
                  type="text"
                  value={form.borehole_type}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>

              <div className="form-field">
                <label htmlFor="start_date">
                  Drilling Start Date
                </label>

                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>

              <div className="form-field">
                <label htmlFor="end_date">
                  Drilling End Date
                </label>

                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>

              <div className="form-field">
                <label htmlFor="final_depth">
                  Final Depth
                </label>

                <input
                  id="final_depth"
                  name="final_depth"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.final_depth}
                  onChange={handleChange}
                  required={!importedWorkbook}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="actions"
          style={{
            justifyContent: "flex-end",
            marginTop: "13px",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => navigate("/")}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </>
  );
}