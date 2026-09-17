const LAB_INPUT_MODES = [
   { id: "manual", label: "Manual" },
//   { id: "ags", label: "AGS" },
   { id: "excel", label: "Excel / CSV" }
 ];

 interface LabInputModeBarProps {
   activeMode: string;
   onSelectMode: (modeId: string) => void;
 }

 export function LabInputModeBar({
   activeMode,
   onSelectMode,
 }: LabInputModeBarProps) {
   return (
     <div className="modebar">
       <b>Input:</b>

       {LAB_INPUT_MODES.map((mode) => (
         <button
           key={mode.id}
           type="button"
           className={`mode ${activeMode === mode.id ? "active" : ""}`}
           aria-pressed={activeMode === mode.id}
           onClick={() => onSelectMode(mode.id)}
         >
           {mode.label}
         </button>
       ))}
     </div>
   );
 }
