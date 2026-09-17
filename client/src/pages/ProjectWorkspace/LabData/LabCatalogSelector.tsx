 export interface LabCatalogEntry {
   id: string;
   label: string;
 }

export const LAB_CATALOG: LabCatalogEntry[] = [
   { id: "index", label: "Index / Classification" },
   { id: "particle_size", label: "Particle Size" },
   { id: "atterberg", label: "Atterberg Limits" },
   { id: "density", label: "Density / Specific Gravity" },
   { id: "compaction", label: "Compaction / CBR" },
   { id: "permeability", label: "Permeability" },
   { id: "consolidation", label: "Oedometer / Consolidation" },
   { id: "direct_shear", label: "Direct Shear" },
   { id: "triaxial", label: "Triaxial UU / CU / CD" },
   { id: "ucs", label: "UCS / Strength" },
   { id: "swelling_collapse", label: "Swelling / Collapse" },
   { id: "chemical", label: "Chemical / Aggressivity" },
   { id: "rock", label: "Rock Tests" },
   { id: "other", label: "Other configured laboratory test" },
 ];

interface LabCatalogSelectorProps {
   activeModule: string;
   onSelectModule: (moduleId: string) => void;
 }


export function LabCatalogSelector({
   activeModule,
   onSelectModule,
 }: LabCatalogSelectorProps) {
   return (
     <div className="catalog">
       {LAB_CATALOG.map((entry) => (
         <button
           key={entry.id}
           type="button"
           className={`item ${activeModule === entry.id ? "active" : ""}`}
           aria-pressed={activeModule === entry.id}
           onClick={() => onSelectModule(entry.id)}
         >
           {entry.label}
         </button>
       ))}
     </div>
   );
 }
