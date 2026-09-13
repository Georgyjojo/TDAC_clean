interface PlaceholderPanelProps {
  title: string;
}

export function PlaceholderPanel({ title }: PlaceholderPanelProps) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
      </div>

      <div className="panel-body">
        <p className="page-sub">This module will be built here.</p>
      </div>
    </section>
  );
}
