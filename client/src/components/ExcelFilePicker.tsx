import { useRef, useState } from "react";
import { parseExcelWorkbook } from "../api/excelImport";

/**
 * Shared Excel input-sheet picker used by both import flows.
 *
 * Reading the workbook happens once, here; the parent receives the parsed
 * result and decides what to do with it (prefill a form, commit a LOCA).
 * Any sheet variant the server recognizes imports; the server is the
 * single source of parsing truth.
 *
 * The chosen file is tracked as local state so the row can be dismissed
 * before submit — picking a wrong sheet should never lock the form into
 * the workbook path.
 */

interface ExcelFilePickerProps {
  onParsed: (workbook: import("../api/excelImport").ImportedWorkbook, suggestions: import("../api/excelImport").ImportSuggestions) => void;
  onError: (message: string) => void;
  onCleared?: () => void;
  disabled?: boolean;
  label?: string;
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 2.5A1.5 1.5 0 0 1 4.5 1H9l4 4v8.5A1.5 1.5 0 0 1 11.5 15h-7A1.5 1.5 0 0 1 3 13.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ExcelFilePicker({
  onParsed,
  onError,
  onCleared,
  disabled = false,
  label = "Import from Excel input sheet",
}: ExcelFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Reset the input so picking the same file twice re-fires the event.
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setBusy(true);
      const result = await parseExcelWorkbook(file);
      setFileName(file.name);
      onParsed(result.workbook, result.suggestions);
    } catch (error) {
      console.error("Excel parse failed:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Unable to read this workbook."
      );
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFileName(null);
    onCleared?.();
  }

  return (
    <div className="excel-import">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,.xls"
        onChange={handleFile}
        disabled={busy || disabled}
        style={{ display: "none" }}
      />

      {fileName && !busy ? (
        <div className="excel-file-chip" role="status">
          <span className="excel-file-name">
            <FileIcon />
            {fileName}
          </span>
          <button
            type="button"
            className="excel-file-remove"
            onClick={clearFile}
            disabled={disabled}
            aria-label={`Remove ${fileName}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 2.5l7 7m0-7l-7 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn"
          disabled={busy || disabled}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Reading workbook..." : label}
        </button>
      )}
    </div>
  );
}
