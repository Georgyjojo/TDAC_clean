import { useEffect, useState } from "react";
 import { getLabResults, type LabResultRow } from "../../../../api/lab";

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

 interface HistoricDataTabProps {
   projectId: string;
 }

 export function HistoricDataTab({ projectId }: HistoricDataTabProps) {
   const [filter, setFilter] = useState({
     ...EMPTY_FILTER,
     project: projectId,
   });

   const [results, setResults] = useState<LabResultRow[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   function setField(field: keyof HistoricFilter, value: string) {
       setFilter((current) => ({ ...current, [field]: value }));
     }

     // Parses the free-text depth range ("5-15", "5", or "5 to 15") into
     // [depth_from, depth_to]. Unparseable input yields both undefined so the
     // query simply omits the depth filter instead of erroring.
     function parseDepthRange(raw: string): { from?: number; to?: number } {
       const trimmed = raw.trim();

       if (trimmed === "") {
         return {};
       }

       const parts = trimmed.split(/[-\s]+|to/i).map(Number);

       if (parts.length === 1 && Number.isFinite(parts[0])) {
         return { from: parts[0] };
       }

       if (
         parts.length >= 2 &&
         Number.isFinite(parts[0]) &&
         Number.isFinite(parts[1])
       ) {
         const from = Math.min(parts[0], parts[1]);
         const to = Math.max(parts[0], parts[1]);
         return { from, to };
       }

       return {};
     }

     useEffect(() => {
       let cancelled = false;

       async function load() {
         try {
           setLoading(true);
           setError(null);

           const depth = parseDepthRange(filter.depthRange);

           const data = await getLabResults(projectId, {
             sample: filter.sample,
             depth_from: depth.from,
             depth_to: depth.to,
             test_type: filter.test,
           });

           if (!cancelled) {
             setResults(data);
           }
         } catch (err) {
           if (!cancelled) {
             setError(
               err instanceof Error ? err.message : "Failed to load results"
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
     }, [projectId, filter.sample, filter.depthRange, filter.test]);

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

         {loading ? (
           <div className="empty-state">
             <h3>Loading results...</h3>
           </div>
         ) : error ? (
           <div className="empty-state">
             <h3>Could not load results</h3>
             <p>{error}</p>
           </div>
         ) : results.length === 0 ? (
           <div className="empty-state">
             <h3>No approved results yet</h3>
             <p>
               Approved laboratory results for this filter will appear here
               once tests are approved and published.
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
                   <tr key={`${result.test_id}-${result.spec_ref ?? "sp"}`}>
                     <td>{result.proj_id}</td>
                     <td>{result.sample_id}</td>
                     <td className="num">{result.depth}</td>
                     <td>{result.test_type}</td>
                     <td className="num">{result.ll}</td>
                     <td className="num">{result.pi}</td>
                     <td colSpan={4} className="cell-dim">
                       -
                     </td>
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
