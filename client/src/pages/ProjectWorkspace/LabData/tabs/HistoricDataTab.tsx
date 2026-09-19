import { useState } from "react";

 interface HistoricFilter {
   project: string;
   sample: string;
   depthRange: string;
   test: string;
 }

 const EMPTY_FILTER: HistoricFilter = {
   project: "",
   sample: "",
   depthRange: "",
   test: "",
 };

 interface ApprovedResult {
   projectId: string;
   sampleId: string;
   depth: string;
   material: string;
   ll: string;
   pi: string;
   fines: string;
   gs: string;
   cu: string;
   cc: string;
 }

 export function HistoricDataTab() {
   const [filter, setFilter] = useState(EMPTY_FILTER);

   // Approved results come from the lab results API in a later step.
   // Until then the matrix shows an honest empty state, never fake rows.
   const [results] = useState<ApprovedResult[]>([]);

   function setField(field: keyof HistoricFilter, value: string) {
     setFilter((current) => ({ ...current, [field]: value }));
   }

   return (
     <div>
       <div className="module-toolbar">
         <div>
           <div className="eyebrow">EXISTING AND COMPLETED PROJECTS</div>
           <h3 className="panel-subtitle">Historic Laboratory Results</h3>
         </div>

         <div className="actions">
           <button type="button" className="btn btn-sm">Save filter</button>
           <button type="button" className="btn btn-sm btn-primary">
             Export selection
           </button>
         </div>
       </div>

       <div className="card">
         <h3>Filter</h3>

         <div className="form-grid">
           <label>
             <span className="eyebrow">Project</span>
             <select
               className="modal-input"
               value={filter.project}
               onChange={(event) => setField("project", event.target.value)}
             >
               <option value="">All accessible projects</option>
             </select>
           </label>

           <label>
             <span className="eyebrow">Location / sample</span>
             <input
               className="modal-input"
               placeholder="BH, sample or specimen ID"
               value={filter.sample}
               onChange={(event) => setField("sample", event.target.value)}
             />
           </label>

           <label>
             <span className="eyebrow">Depth range (m)</span>
             <input
               className="modal-input"
               placeholder="e.g. 5-15"
               value={filter.depthRange}
               onChange={(event) => setField("depthRange", event.target.value)}
             />
           </label>

           <label>
             <span className="eyebrow">Test / parameter</span>
             <select
               className="modal-input"
               value={filter.test}
               onChange={(event) => setField("test", event.target.value)}
             >
               <option value="">All laboratory tests</option>
             </select>
           </label>
         </div>
       </div>

       <div className="card" style={{ marginTop: "12px" }}>
         <h3>Approved result matrix</h3>

         {results.length === 0 ? (
           <div className="empty-state">
             <h3>No approved results yet</h3>
             <p>
               Approved laboratory results for this filter will appear here
               once the results API is connected.
             </p>
           </div>
         ) : (
           <div className="table-scroll">
             <table className="dtable">
               <thead>
                 <tr>
                   <th>Project</th>
                   <th>Sample</th>
                   <th>Depth (m)</th>
                   <th>Material</th>
                   <th>LL</th>
                   <th>PI</th>
                   <th>Fines</th>
                   <th>Gs</th>
                   <th>cu</th>
                   <th>Cc</th>
                   <th>Status</th>
                 </tr>
               </thead>
               <tbody>
                 {results.map((result) => (
                   <tr key={`${result.projectId}-${result.sampleId}`}>
                     <td>{result.projectId}</td>
                     <td>{result.sampleId}</td>
                     <td className="num">{result.depth}</td>
                     <td>{result.material}</td>
                     <td className="num">{result.ll}</td>
                     <td className="num">{result.pi}</td>
                     <td className="num">{result.fines}</td>
                     <td className="num">{result.gs}</td>
                     <td className="num">{result.cu}</td>
                     <td className="num">{result.cc}</td>
                     <td>
                       <span className="chip chip-ok">Approved</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         )}
       </div>

       <div className="card" style={{ marginTop: "12px" }}>
         <h3>Data provenance</h3>

         <div className="table-scroll">
           <table className="dtable">
             <tbody>
               <tr>
                 <td>Results shown</td>
                 <td>Approved only</td>
               </tr>
               <tr>
                 <td>Project profile</td>
                 <td>AGS 4.2</td>
               </tr>
               <tr>
                 <td>Unit normalization</td>
                 <td>SI</td>
               </tr>
               <tr>
                 <td>Superseded records</td>
                 <td>Hidden</td>
               </tr>
             </tbody>
           </table>
         </div>

         <p className="paper-note">
           The summary is a query over released results. It is not a manually
           maintained duplicate table.
         </p>
       </div>
     </div>
   );
 }
