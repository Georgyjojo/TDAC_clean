import { useEffect, useState } from "react";
import {
  getSptRecords,
  createSptRecord,
  updateSptRecord,
  type SptRecord,
  type SptCreate,
  type SptUpdate,
} from "../../../api/fieldData";

interface SptModuleProps {
  projectId: string;
  locaId: string;
}

function formatNumber(value: number | null): string {
  return value === null || value === undefined ? "—" : String(value);
}

const EMPTY_DRAFT: SptCreate = {
  spt_depth: 0,
  blows_15: null,
  blows_30: null,
  blows_45: null,
  n_value: null,
};

export function SptModule({ projectId, locaId }: SptModuleProps) {
  const [records, setRecords] = useState<SptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingKey, setEditingKey] = useState<number | null>(null);
  const [draft, setDraft] = useState<SptUpdate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [newRecord, setNewRecord] = useState<SptCreate>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await getSptRecords(projectId, locaId);

        if (!cancelled) {
          setRecords(data);
        }
      } catch (err) {
        console.error("Failed to load SPT records:", err);

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load SPT data."
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

      const created = await createSptRecord(projectId, locaId, newRecord);

      setRecords((current) =>
        [...current, created].sort((a, b) => a.spt_depth - b.spt_depth)
      );

      setAdding(false);
      setNewRecord(EMPTY_DRAFT);
    } catch (err) {
      console.error("Failed to create SPT record:", err);
      setCreateError(
        err instanceof Error ? err.message : "Unable to create record."
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(record: SptRecord) {
    setEditingKey(record.spt_depth);
    setDraft({
      spt_depth: record.spt_depth,
      blows_15: record.blows_15,
      blows_30: record.blows_30,
      blows_45: record.blows_45,
      n_value: record.n_value,
    });
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft(null);
    setSaveError(null);
  }

  async function saveEdit(originalSptDepth: number) {
    if (!draft) {
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const updated = await updateSptRecord(
        projectId,
        locaId,
        originalSptDepth,
        draft
      );

      setRecords((current) =>
        current
          .map((record) =>
            record.spt_depth === originalSptDepth
              ? { ...record, ...updated }
              : record
          )
          .sort((a, b) => a.spt_depth - b.spt_depth)
      );

      setEditingKey(null);
      setDraft(null);
    } catch (err) {
      console.error("Failed to update SPT record:", err);
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
        <h3 className="panel-subtitle">SPT</h3>

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
              <span className="eyebrow">SPT DEPTH (m) *</span>
              <input
                className="modal-input"
                type="number"
                step="0.01"
                value={newRecord.spt_depth}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    spt_depth: Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">BLOWS @15CM</span>
              <input
                className="modal-input"
                type="number"
                value={newRecord.blows_15 ?? ""}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    blows_15:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">BLOWS @30CM</span>
              <input
                className="modal-input"
                type="number"
                value={newRecord.blows_30 ?? ""}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    blows_30:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">BLOWS @45CM</span>
              <input
                className="modal-input"
                type="number"
                value={newRecord.blows_45 ?? ""}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    blows_45:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>

            <label>
              <span className="eyebrow">SPT N-VALUE</span>
              <input
                className="modal-input"
                type="number"
                value={newRecord.n_value ?? ""}
                onChange={(event) =>
                  setNewRecord({
                    ...newRecord,
                    n_value:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

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
          <h3>No SPT data</h3>
          <p>No SPT data available for this location.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>SPT Depth (m)</th>
                <th>Blows @15cm</th>
                <th>Blows @30cm</th>
                <th>Blows @45cm</th>
                <th>SPT N-value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const isEditing = editingKey === record.spt_depth;

                return (
                  <tr key={record.spt_depth}>
                    {isEditing && draft ? (
                      <>
                        <td>
                          <input
                            className="modal-input"
                            type="number"
                            step="0.01"
                            value={draft.spt_depth}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                spt_depth: Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="modal-input"
                            type="number"
                            value={draft.blows_15 ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                blows_15:
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
                            value={draft.blows_30 ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                blows_30:
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
                            value={draft.blows_45 ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                blows_45:
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
                            value={draft.n_value ?? ""}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                n_value:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={saving}
                              onClick={() => saveEdit(record.spt_depth)}
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
                        <td className="num">{formatNumber(record.spt_depth)}</td>
                        <td className="num">{formatNumber(record.blows_15)}</td>
                        <td className="num">{formatNumber(record.blows_30)}</td>
                        <td className="num">{formatNumber(record.blows_45)}</td>
                        <td className="num">{formatNumber(record.n_value)}</td>
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
