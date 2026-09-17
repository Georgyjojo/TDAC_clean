 import { useState } from "react";
 import { useParams } from "react-router-dom";
 import { LabCatalogSelector, LAB_CATALOG } from "./LabCatalogSelector";
 import { LabInputModeBar } from "./LabInputModeBar";

 export function LabData() {
   const { projectId } = useParams();

   const [activeModule, setActiveModule] = useState("atterberg");
   const [activeMode, setActiveMode] = useState("manual");

   const activeLabel =
     LAB_CATALOG.find((entry) => entry.id === activeModule)?.label ?? "Lab test";

   return (
     <section className="panel">
       <div className="panel-head">
         <h2 className="panel-title">Lab Data</h2>
       </div>

       <div className="panel-body">
         <div className="field-layout">
           <LabCatalogSelector
             activeModule={activeModule}
             onSelectModule={setActiveModule}
           />

           <div>
             <LabInputModeBar
               activeMode={activeMode}
               onSelectMode={setActiveMode}
             />

             <div className="card">
               <h3>{activeLabel}</h3>
               <p className="page-sub">
                 Module input for {activeLabel} is not connected yet.
               </p>
             </div>

             {/* LabResultSummaryTable goes here (file 6) */}
           </div>
         </div>
       </div>
     </section>
   );
 }
