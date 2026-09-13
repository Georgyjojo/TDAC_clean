import { useEffect, useState } from "react";
import {
  getSamplingRecords,
  createSamplingRecord,
  updateSamplingRecord,
  type SamplingRecord,
  type SamplingCreate,
  type SamplingUpdate,
} from "../../../api/fieldData";

interface SamplingModuleProps {
  projectId: string;
  locaId: string;
}

function formatNumber(value: number | null): string {
  return value === null || value === undefined ? "—" : String(value);
}

const EMPTY_DRAFT: SamplingCreate = {
  depth_from: 0,
  depth_to: null,
  recovery: null,
  rqd: null,
  remark: null,
};

export function SamplingModule({ projectId, locaId }: SamplingModuleProps) {
  const [records, setRecords] = useState<SamplingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [draft, setDraft] = useState<SamplingUpdate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [newRecord, setNewRecord] = useState<SamplingCreate>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await getSamplingRecords(projectId, locaId);

        if (!cancelled) {
          setRecords(data);
        }
      } catch (err) {
        console.error("Failed to load sampling/coring records:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load sampling/coring data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId, locaId]);

  function startAdd() {
    setNewRecord(EMPTY_DRAFT);
    setCreateError(null);
    setAdding(true);
  }

  function cancelAdd() {
    setAdding(false);
    setCreateError(null);
  }

  async function saveNewRecord() {
    try {
      setCreating(true);
      setCreateError(null);

      const created = await createSamplingRecord(projectId, locaId, newRecord);

      setRecords((current) =>
        [...current, created].sort((a, b) => a.depth_from - b.depth_from)
      );

      setAdding(false);
      setNewRecord(EMPTY_DRAFT);
    } catch (err) {
      console.error("Failed to create sampling/coring record:", err);
      setCreateError(
        err instanceof Error ? err.message : "Unable to create record."
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(record: SamplingRecord) {
    setEditingKey(record.depth_from);
    setDraft({
      depth_from: record.depth_from,
      depth_to: record.depth_to,
      rock_description: record.rock_description,
      recovery: record.recovery,
      rqd: record.rqd,
      remark: record.remark,
    });
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft(null);
    setSaveError(null);
  }

  async function saveEdit(originalDepthFrom: number) {
    if (!draft) {
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const updated = await updateSamplingRecord(
        projectId,
        locaId,
        originalDepthFrom,
        draft
      );

      setRecords((current) =>
        current
          .map((record) =>
            record.depth_from === originalDepthFrom
              ? { ...record, ...updated }
              : record
          )
          .sort((a, b) => a.depth_from - b.depth_from)
      );

      setEditingKey(null);
      setDraft(null);
    } catch (err) {
      console.error("Failed to update sampling/coring record:", err);
      setSaveError(
        err instanceof Error ? err.message : "Unable to save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="page-sub">Loading Field Data…</p>;
  }

  if (error) {
    return <p className="page-sub field-error">{error}</p>;
  }

  return (
    <div>
      <div className="module-toolbar">
        <h3 className="panel-subtitle">Sampling / Coring</h3>

        {!adding && (
          <button type="button" className="btn btn-sm btn-primary" onClick={startAdd}>
            + Add Record
          </button>
        )}
      </div>

      {adding && (
        <div className="add-record-form">
          <div className="form-grid">
            <label>
              <span className="eyebrow">DEPTH FROM (m) *</span>
              <input
                className="modal-input"
                type="number"
                step="0.01"
                value={newRecord.depth_from}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    depth_from: Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">DEPTH TO (m)</span>
              <input
                className="modal-input"
                type="number"
                step="0.01"
                value={newRecord.depth_to ?? ""}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    depth_to:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">RECOVERY</span>
              <input
                className="modal-input"
                type="number"
                step="0.01"
                value={newRecord.recovery ?? ""}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    recovery:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">RQD</span>
              <input
                className="modal-input"
                type="number"
                step="0.01"
                value={newRecord.rqd ?? ""}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    rqd:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">REMARK</span>
              <input
                className="modal-input"
                type="text"
                value={newRecord.remark ?? ""}
                onChange={(event) =>
                  setNewRecord({ ...newRecord, remark: event.target.value })
                }
              />
            </label>
          </div>

          <p className="page-sub" style={{ marginTop: "6px" }}>
            Rock Description is sourced from the Borehole / Drilling geology
            log and can't be set when adding a new sample — add or edit the
            matching geology interval from the Borehole / Drilling tab.
          </p>

          {createError && <p className="page-sub field-error">{createError}</p>}

          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={cancelAdd}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveNewRecord}
              disabled={creating}
            >
              {creating ? "Adding…" : "Add Record"}
            </button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state">
          <h3>No sampling/coring data</h3>
          <p>No sampling/coring data available for this location.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Depth From (m)</th>
                <th>Depth To (m)</th>
                <th>Rock Description</th>
                <th>Recovery</th>
                <th>RQD</th>
                <th>Remark</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const isEditing = editingKey === record.depth_from;

                return (
                  <tr key={record.depth_from}>
                    {isEditing && draft ? (
                      <>
                        <td>
                          <input
                            className="modal-input"
                            type="number"
                            step="0.01"
                            value={draft.depth_from}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                depth_from: Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="modal-input"
                            type="number"
                            step="0.01"
                            value={draft.depth_to ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                depth_to:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="modal-input"
                            type="text"
                            value={draft.rock_description ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                rock_description: event.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="modal-input"
                            type="number"
                            step="0.01"
                            value={draft.recovery ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                recovery:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="modal-input"
                            type="number"
                            step="0.01"
                            value={draft.rqd ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                rqd:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="modal-input"
                            type="text"
                            value={draft.remark ?? ""}
                            onChange={(event) =>
                              setDraft({ ...draft, remark: event.target.value })
                            }
                          />
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={saving}
                              onClick={() => saveEdit(record.depth_from)}
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm"
                              disabled={saving}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="num">{formatNumber(record.depth_from)}</td>
                        <td className="num">{formatNumber(record.depth_to)}</td>
                        <td>{record.rock_description || "—"}</td>
                        <td className="num">{formatNumber(record.recovery)}</td>
                        <td className="num">{formatNumber(record.rqd)}</td>
                        <td>{record.remark || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => startEdit(record)}
                          >
                            Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {saveError && (
            <p className="page-sub field-error" style={{ marginTop: "10px" }}>
              {saveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
