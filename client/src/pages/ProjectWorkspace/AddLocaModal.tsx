import { useState } from "react";
import { createLoca, type LocaRecord } from "../../api/projects";

interface AddLocaModalProps {
  projectId: string | undefined;
  onClose: () => void;
  onCreated: (loca: LocaRecord) => void;
}

export function AddLocaModal({
  projectId,
  onClose,
  onCreated,
}: AddLocaModalProps) {
  const [locaId, setLocaId] = useState("");
  const [locaType, setLocaType] = useState("BH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [finalDepth, setFinalDepth] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!projectId) {
      setError("No project ID was provided.");
      return;
    }

    if (!locaId.trim()) {
      setError("Location ID is required.");
      return;
    }

    if (!locaType.trim()) {
      setError("Location type is required.");
      return;
    }

    if (finalDepth && Number(finalDepth) <= 0) {
      setError("Final depth must be greater than zero.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const created = await createLoca(projectId, {
        loca_id: locaId.trim(),
        loca_type: locaType.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        final_depth: finalDepth ? Number(finalDepth) : null,
      });

      // Refresh the parent's location list immediately so the new
      // location can be selected without an unrelated page refresh.
      onCreated(created);
      onClose();
    } catch (error) {
      console.error("Failed to create location:", error);

      setError(
        error instanceof Error ? error.message : "Unable to create location."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="panel-head">
          <h2 className="panel-title">Add Investigation Location</h2>

          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="panel-body">
            <label>
              <span className="eyebrow">LOCATION ID *</span>
              <input
                type="text"
                value={locaId}
                onChange={(event) => setLocaId(event.target.value)}
                placeholder="BH-003"
              />
            </label>

            <label>
              <span className="eyebrow">LOCATION TYPE *</span>
              <input
                type="text"
                value={locaType}
                onChange={(event) => setLocaType(event.target.value)}
                placeholder="BH"
              />
            </label>

            <label>
              <span className="eyebrow">START DATE</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label>
              <span className="eyebrow">END DATE</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <label>
              <span className="eyebrow">FINAL DEPTH (m)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={finalDepth}
                onChange={(event) => setFinalDepth(event.target.value)}
                placeholder="30.00"
              />
            </label>

            {error && <p className="page-sub">{error}</p>}

            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Adding…" : "Add Location"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
