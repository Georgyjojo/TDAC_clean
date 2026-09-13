"""
Excel input-sheet parser.

Single reusable reader for the TDAC field input workbook (see
Input_sheet_V8_AGS_mapped.xlsx). Produces plain JSON-ready dicts that both
import flows reuse:

  - "Add New Project"  -> PROJ + first LOCA + GEOL + CORE + ISPT rows
  - "Overview / import" -> one extra LOCA + its GEOL + CORE + ISPT rows

Design constraints:
  - No new database columns anywhere; every value lands in an existing
    AGS column (see schemas/field_data.py for the fixed mapping).
  - Sheets are located by header tokens, not by name or position, so any
    renamed/reordered workbook variant still imports.
  - Parsing is capped by row limits and stops at the first blank data row,
    keeping memory and CPU proportional to real data instead of sheet
    dimensions (the example SPT sheet pads 20+ empty styled rows).
  - The in-sheet "AGS Equivalent" mapping legend column is documentation,
    never data; header-token matching ignores it naturally.
  - Depths keep at most 10 decimals: the example sheet stores 2.2 as
    2.1999999999999997, and the rounded value is what the database unique
    constraints must see for a re-import to be idempotent.
"""

from __future__ import annotations

import io
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet

# Hard bounds. A real input sheet holds hundreds of rows at most; anything
# past these limits is stray formatting or a wrong file, not data to load.
_MAX_ROWS = 2000
_MAX_COLS = 64

# Header tokens that identify each data sheet. A header row must contain
# ALL tokens of one group for the sheet to be treated as that data sheet.
_BORELOG_TOKENS = ("depth from", "depth to", "soil description")
_ROCK_TOKENS = ("depth from", "depth to", "rock description")
_SPT_TOKENS = ("spt depth", "n-value")

# Full column sets the row readers extract after a sheet is identified.
_BORELOG_COLS = _BORELOG_TOKENS + ("sand/ clay",)
_ROCK_COLS = _ROCK_TOKENS + ("recovery", "rqd", "remark")

# ProjectInfo is a label/value block with no header row, so it is detected
# by its labels in column A. AGS_Mapping_Remarks mentions the same labels
# but in column D, so the column-A restriction keeps detection unambiguous.
_PROJECT_INFO_LABELS = ("client name", "borehole number")

# Excel serial dates or dd.mm.yyyy text both appear in the wild; accept the
# common Indian-format variants plus ISO.
_DATE_FORMATS = ("%d.%m.%Y", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d")


class ExcelImportError(Exception):
    """User-facing import failure. `message` is safe to show in the UI."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


# ---------------------------------------------------------------------------
# Cell helpers
# ---------------------------------------------------------------------------

def _norm(text: Any) -> str:
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    return " ".join(text.split()).strip().lower()


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    return False


def _num(value: Any, field: str, row_no: int, required: bool = True) -> Optional[float]:
    if _is_blank(value):
        if required:
            raise ExcelImportError(
                f"{field} is empty on the sheet (row {row_no})."
            )
        return None
    if isinstance(value, bool):
        raise ExcelImportError(
            f"{field} must be a number, not TRUE/FALSE (row {row_no})."
        )
    if isinstance(value, (int, float)):
        result = float(value)
    else:
        try:
            result = float(str(value).replace(",", "."))
        except ValueError:
            raise ExcelImportError(
                f"{field} is not a valid number: {value!r} (row {row_no})."
            ) from None
    if result != result or result in (float("inf"), float("-inf")):
        raise ExcelImportError(
            f"{field} is not a finite number (row {row_no})."
        )
    return round(result, 10)


def _text(value: Any) -> Optional[str]:
    if _is_blank(value):
        return None
    return str(value).strip()


def _date(value: Any, field: str) -> Optional[date]:
    if _is_blank(value):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    raw = str(value).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    raise ExcelImportError(f"{field} is not a valid date: {raw!r}") from None


# ---------------------------------------------------------------------------
# Sheet helpers
# ---------------------------------------------------------------------------

def _sheet_rows(ws: Worksheet) -> List[List[Any]]:
    rows: List[List[Any]] = []
    for row in ws.iter_rows(
        min_row=1,
        max_row=min(ws.max_row, _MAX_ROWS),
        max_col=min(ws.max_column, _MAX_COLS),
        values_only=True,
    ):
        rows.append(list(row))
    return rows


def _find_header(rows: List[List[Any]], tokens) -> int:
    """Index of the first row whose cells contain every token, else -1."""
    for i, row in enumerate(rows):
        cells = [_norm(c) for c in row]
        if all(any(tok in cell for cell in cells) for tok in tokens):
            return i
    return -1


def _header_map(header_row: List[Any], tokens) -> Dict[str, int]:
    """Token -> first column index whose header cell contains the token.

    Leftmost wins, which keeps data columns ahead of the in-sheet legend
    column even when a legend cell repeats a data header word.
    """
    cells = [_norm(c) for c in header_row]
    found: Dict[str, int] = {}
    for tok in tokens:
        for idx, cell in enumerate(cells):
            if tok in cell:
                found[tok] = idx
                break
    return found


def _cell(row: List[Any], idx: int) -> Any:
    return row[idx] if idx < len(row) else None


def _is_project_info(rows: List[List[Any]]) -> bool:
    labels = [_norm(r[0]) for r in rows if len(r) > 0]
    return all(
        any(label.startswith(tok) for label in labels if label)
        for tok in _PROJECT_INFO_LABELS
    )


# ---------------------------------------------------------------------------
# Sheet readers
# ---------------------------------------------------------------------------

def _read_project_info(rows: List[List[Any]]) -> Dict[str, Any]:
    labels: Dict[str, Any] = {}
    for row in rows:
        if len(row) < 2:
            continue
        label = _norm(row[0])
        if not label or _is_blank(row[1]):
            continue
        labels[label] = row[1]

    def find(*keywords: str) -> Any:
        for label, value in labels.items():
            if all(kw in label for kw in keywords):
                return value
        return None

    return {
        "project_type": _text(find("project type")),
        "project_location": _text(find("project location")),
        "client_name": _text(find("client name")),
        "borehole_number": _text(find("borehole number")),
        "start_date": _date(find("drilling", "start"), "Drilling start date"),
        "end_date": _date(find("drilling", "completion"), "Drilling completion date"),
        "final_depth": _num(find("termination"), "Termination depth", 0)
        if find("termination") is not None
        else None,
    }


def _read_interval_rows(
    rows: List[List[Any]],
    header_idx: int,
    data_tokens,
) -> List[Dict[str, Any]]:
    """Borelog / Rock profile rows: keyed by depth-from and depth-to columns.

    data_tokens covers every extractable column, not just the tokens that
    identified the sheet, so optional columns (Sand/Clay, Recovery, RQD,
    Remark) are located too.
    """
    cols = _header_map(rows[header_idx], data_tokens)
    records: List[Dict[str, Any]] = []

    for offset, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
        depth_from_cell = _cell(row, cols["depth from"])
        depth_to_cell = _cell(row, cols["depth to"])

        if _is_blank(depth_from_cell) and _is_blank(depth_to_cell):
            # First fully empty depth pair marks the end of the data block;
            # styled-but-empty padding and footer blocks after it are ignored.
            break

        record: Dict[str, Any] = {
            "depth_from": _num(depth_from_cell, "Depth From", offset),
            "depth_to": _num(depth_to_cell, "Depth To", offset),
        }
        for key, tok in (
            ("soil_description", "soil description"),
            ("sand_clay", "sand/ clay"),
            ("rock_description", "rock description"),
            ("recovery", "recovery"),
            ("rqd", "rqd"),
            ("remark", "remark"),
        ):
            if tok not in cols:
                continue
            if key in ("recovery", "rqd"):
                record[key] = _num(
                    _cell(row, cols[tok]), key, offset, required=False
                )
            else:
                record[key] = _text(_cell(row, cols[tok]))
        if record["depth_to"] <= record["depth_from"]:
            raise ExcelImportError(
                f"Depth To must be greater than Depth From at row {offset}."
            )
        records.append(record)

    return records


def _read_spt_rows(rows: List[List[Any]], header_idx: int) -> List[Dict[str, Any]]:
    cols = _header_map(
        rows[header_idx],
        ("spt depth", "blows @15cm", "blows @30cm", "blows @45cm", "n-value"),
    )
    records: List[Dict[str, Any]] = []

    for offset, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
        depth_cell = _cell(row, cols["spt depth"])
        if _is_blank(depth_cell):
            # The SPT sheet pads with empty rows and ends with a derived
            # "Layer 1..9" summary block that holds no ISPT data.
            break

        records.append(
            {
                "spt_depth": _num(depth_cell, "SPT Depth", offset),
                "blows_15": _num(_cell(row, cols["blows @15cm"]), "Blows @15cm", offset, required=False),
                "blows_30": _num(_cell(row, cols["blows @30cm"]), "Blows @30cm", offset, required=False),
                "blows_45": _num(_cell(row, cols["blows @45cm"]), "Blows @45cm", offset, required=False),
                "n_value": _num(_cell(row, cols["n-value"]), "SPT N-value", offset, required=False),
            }
        )

    return records


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def parse_input_sheet(data: bytes) -> Dict[str, Any]:
    """Workbook bytes -> project info + borelog + rock profile + SPT rows.

    Raises ExcelImportError with a user-safe message on any structural
    problem (unknown file, missing sheet, unparseable cell).
    """
    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception:
        raise ExcelImportError(
            "This file could not be opened as an Excel workbook. "
            "Save it as .xlsx and try again."
        ) from None

    result: Dict[str, Any] = {
        "project_info": {},
        "borelog": [],
        "rock_profile": [],
        "spt": [],
    }

    saw_data_sheet = False

    for ws in wb.worksheets:
        rows = _sheet_rows(ws)
        if not rows:
            continue

        if _is_project_info(rows):
            result["project_info"] = _read_project_info(rows)
            saw_data_sheet = True
            continue

        header_idx = _find_header(rows, _BORELOG_TOKENS)
        if header_idx >= 0:
            result["borelog"] = _read_interval_rows(
                rows, header_idx, _BORELOG_COLS
            )
            saw_data_sheet = True
            continue

        header_idx = _find_header(rows, _ROCK_TOKENS)
        if header_idx >= 0:
            result["rock_profile"] = _read_interval_rows(
                rows, header_idx, _ROCK_COLS
            )
            saw_data_sheet = True
            continue

        header_idx = _find_header(rows, _SPT_TOKENS)
        if header_idx >= 0:
            result["spt"] = _read_spt_rows(rows, header_idx)
            saw_data_sheet = True

    if not saw_data_sheet:
        raise ExcelImportError(
            "No recognizable data sheets were found. Expected sheets: "
            "ProjectInfo, Borelog, Rock profile, SPT_Data."
        )

    wb.close()
    return result
