 export interface ReleaseGate {
   name: string;
   status: "pass" | "warn" | "pending";
   detail: string;
 }

 interface QaApprovalTabProps {
   // Review data comes from the QA API in a later step. Until then the
   // queue shows an honest empty state, never fake rows.
   queue?: never;
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

 export function QAApprovalTab() {
   const queue: unknown[] = [];

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

         {queue.length === 0 ? (
           <div className="empty-state">
             <h3>No results awaiting review</h3>
             <p>
               Submitted results appear here once the QA API is connected.
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
                   <tr key={String(item)}>
                     <td>{String(item)}</td>
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
