import { LabDataTabs } from "./LabDataTabs";

export function LabData() {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Lab Data</h2>
      </div>

      <div className="panel-body">
        <LabDataTabs />
      </div>
    </section>
  );
}