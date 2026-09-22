import { useState } from "react";
import { OverviewTab } from "./tabs/OverviewTab";
import { TestRegisterTab } from "./tabs/TestRegisterTab";
import { ResultsEntryTab } from "./tabs/ResultsEntryTab";
import { HistoricDataTab } from "./tabs/HistoricDataTab";
import { QAApprovalTab } from "./tabs/QAApprovalTab";
import { AGSMappingTab } from "./tabs/AGSMappingTab";

type LabTab =
  | "overview"
  | "test-register"
  | "results-entry"
  | "historic-data"
  | "qa-approval"
  | "ags-mapping";

const TABS: { id: LabTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "test-register", label: "Test Register" },
  { id: "results-entry", label: "Results Entry" },
  { id: "historic-data", label: "Historic Data" },
  { id: "qa-approval", label: "QA and Approval" },
  { id: "ags-mapping", label: "AGS Mapping" },
];
interface LabDataTabsProps {
  projectId: string;
}

export function LabDataTabs({
  projectId,
}: LabDataTabsProps) {
  const [activeTab, setActiveTab] = useState<LabTab>("overview");
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  return (
    <div>
      <div className="lab-data-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`lab-data-tab ${
              activeTab === tab.id ? "active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="lab-data-tab-content">
        {activeTab === "overview" && (
          <OverviewTab
            projectId={projectId}
            onAddTest={() => setActiveTab("test-register")}
            onOpenResults={(testId) => {
              setSelectedTestId(testId);
              setActiveTab("results-entry");
            }}
          />
        )}
        {activeTab === "test-register" && (
          <TestRegisterTab projectId={projectId} />
        )}
        {activeTab === "results-entry" && (
          <ResultsEntryTab selectedTestId={selectedTestId} />
        )}
        {activeTab === "historic-data" && (
           <HistoricDataTab projectId={projectId} />
        )}
        {activeTab === "qa-approval" && (
           <QAApprovalTab projectId={projectId} />
        )}
        {activeTab === "ags-mapping" && <AGSMappingTab />}
      </div>
    </div>
  );
}
