export interface FieldModule {
  id: string;
  label: string;
}

export const FIELD_MODULES: FieldModule[] = [
  { id: "drilling", label: "Borehole / Drilling" },
  { id: "spt", label: "SPT" },
  { id: "sampling", label: "Sampling / Coring" },
  { id: "groundwater", label: "Groundwater" },
];

interface FieldDataModuleTabsProps {
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
}

export function FieldDataModuleTabs({
  activeModule,
  onSelectModule,
}: FieldDataModuleTabsProps) {
  return (
    <div className="modebar">
      <b>Field Module</b>

      {FIELD_MODULES.map((module) => (
        <button
          key={module.id}
          type="button"
          className={`mode ${activeModule === module.id ? "active" : ""}`}
          onClick={() => onSelectModule(module.id)}
        >
          {module.label}
        </button>
      ))}
    </div>
  );
}
