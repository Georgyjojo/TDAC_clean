import { getReviewQueue, type LabReviewQueueRow } from "../../../../api/lab";
import { useEffect, useState } from "react";

export interface ReleaseGate {
  name: string;
  status: "pass" | "warn" | "pending";
  detail: string;
}

interface QAApprovalTabProps {
  projectId: string;
}

const GATES: ReleaseGate[] = [
  { name: "Identity complete", status: "pass", detail: "All key fields present" },
  { name: "Method and equipment", status: "pass", detail: "Valid method recorded" },
  { name: "Raw data complete", status: "pass", detail: "All readings entered" },
  { name: "Calculation regression", status: "pass", detail: "Recalculated values match" },
  { name: "Blocking issues", status: "pass", detail: "0 open issues" },
  { name: "Independent checker", status: "pending", detail: "Awaiting second review" },
];

function gateChip(status: ReleaseGate["status"]) {
  if (status === "pass") {
    return <span className="chip chip-ok">Pass</span>;
  }

  if (status === "warn") {
    return <span className="chip chip-warn">Warnings</span>;
  }

  return <span className="chip chip-muted">Pending</span>;
}

export function QAApprovalTab({ projectId }: QAApprovalTabProps) {
  const [queue, setQueue] = useState<LabReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await getReviewQueue(projectId);

        if (!cancelled) {
          setQueue(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load review queue"
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
  }, [projectId]);

  return (
    <div>
      <div className="module-toolbar">
        <div>
          <div className="eyebrow">CONTROLLED RELEASE</div>
          <h3 className="panel-subtitle">QA and Approval</h3>
        </div>

        <div className="actions">
          <button type="button" className="btn btn-sm">Return with comments</button>
          <button type="button" className="btn btn-sm">Mark checked</button>
          <button type="button" className="btn btn-sm btn-primary">
            Approve and publish
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Result review queue</h3>

        {loading ? (
          <div className="empty-state">
            <h3>Loading review queue...</h3>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Could not load review queue</h3>
            <p>{error}</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="empty-state">
            <h3>No results awaiting review</h3>
            <p>
              Submitted results appear here once tests are submitted for
              independent review.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Sample</th>
                  <th>Prepared by</th>
                  <th>Validation</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.test_id}>
                    <td>{item.test_type}</td>
                    <td>{item.sample_id}</td>
                    <td>{item.prepared_by}</td>
                    <td>
                      {item.blockers > 0 ? (
                        <span className="chip chip-err">
                          {item.blockers} blockers
                        </span>
                      ) : item.warnings > 0 ? (
                        <span className="chip chip-warn">
                          {item.warnings} warnings
                        </span>
                      ) : (
                        <span className="chip chip-ok">Clean</span>
                      )}
                    </td>
                    <td>
                      <span className="chip chip-info">{item.status}</span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "12px" }}>
        <h3>Release gates</h3>

        <div className="table-scroll">
          <table className="dtable">
            <tbody>
              {GATES.map((gate) => (
                <tr key={gate.name}>
                  <td>{gate.name}</td>
                  <td>{gate.detail}</td>
                  <td>{gateChip(gate.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: "12px" }}>
        <h3>Before and after</h3>

        <div className="empty-state">
          <h3>No revision changes recorded</h3>
          <p>
            Field-level changes between revisions appear here once revision
            tracking is connected.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "12px" }}>
        <h3>Publication preview</h3>

        <div className="empty-state">
          <h3>Nothing selected to publish</h3>
          <p>
            Select a result from the review queue to preview its AGS
            publication record.
          </p>
        </div>
      </div>
    </div>
  );
}
