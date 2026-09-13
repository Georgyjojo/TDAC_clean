import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  type CreateProjectPayload,
} from "../api/portfolio";

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

    if (form.end_date < form.start_date) {
      setError(
        "Drilling end date cannot be before start date."
      );
      return;
    }

    if (Number(form.final_depth) <= 0) {
      setError("Final depth must be greater than 0.");
      return;
    }

    setLoading(true);

    try {
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

        <button
          type="button"
          className="btn"
          onClick={() => navigate("/")}
          disabled={loading}
        >
          Cancel
        </button>
      </div>

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
                  required
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
                  required
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
                  required
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
                  required
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
                  required
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
                  required
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
                  required
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
                  required
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