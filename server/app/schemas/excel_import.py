"""
Excel import schemas.

The workbook shape produced by app.excel_parser.parse_input_sheet and the
bodies for the two import endpoints that commit it:

  ProjectExcelImport -> "Add New Project" page (creates PROJ + first LOCA)
  LocaExcelImport    -> Overview "import" (adds a LOCA to an existing project)

Field mapping is fixed by the existing AGS data contract (see
schemas/field_data.py); importing introduces no new database columns:

  Borelog row  -> GEOL (GEOL_TOP, GEOL_BASE, GEOL_DESC, GEOL_GEOL)
  Rock row     -> CORE (CORE_TOP, CORE_BASE, CORE_PREC, CORE_RQD, CORE_REM)
  SPT row      -> ISPT (ISPT_TOP, ISPT_INC1..INC3, ISPT_NVAL)
  Project info -> PROJ (PROJ_LOC, PROJ_CLNT) + LOCA (LOCA_ID, LOCA_STAR,
                  LOCA_ENDD, LOCA_FDEP, LOCA_TYPE)
"""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class ProjectInfoData(BaseModel):
    project_type: Optional[str] = None
    project_location: Optional[str] = None
    client_name: Optional[str] = None
    borehole_number: Optional[str] = None
    # Sheets do not carry it today, but a project-scoped export may state
    # which project it belongs to; the loca import verifies it on commit.
    project_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    final_depth: Optional[float] = None


class BorelogRow(BaseModel):
    depth_from: float
    depth_to: float
    soil_description: Optional[str] = None
    sand_clay: Optional[str] = None


class RockProfileRow(BaseModel):
    depth_from: float
    depth_to: float
    rock_description: Optional[str] = None
    recovery: Optional[float] = None
    rqd: Optional[float] = None
    remark: Optional[str] = None


class SPTImportRow(BaseModel):
    spt_depth: float
    blows_15: Optional[float] = None
    blows_30: Optional[float] = None
    blows_45: Optional[float] = None
    n_value: Optional[float] = None


class ImportedWorkbook(BaseModel):
    project_info: ProjectInfoData = Field(default_factory=ProjectInfoData)
    borelog: List[BorelogRow] = Field(default_factory=list)
    rock_profile: List[RockProfileRow] = Field(default_factory=list)
    spt: List[SPTImportRow] = Field(default_factory=list)


class ProjectExcelImport(BaseModel):
    """Commit body for the Add New Project page.

    Form values override the sheet when present, so a user can correct a
    prefilled field before submitting; anything left blank falls back to
    the workbook's ProjectInfo sheet.
    """

    project_id: str = Field(min_length=1)
    project_name: str = Field(min_length=1)

    project_location: Optional[str] = None
    project_client: Optional[str] = None

    borehole_id: Optional[str] = None
    borehole_type: str = "BH"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    final_depth: Optional[float] = None

    workbook: ImportedWorkbook


class LocaExcelImport(BaseModel):
    """Commit body for the Overview import (location into an open project).

    The location identity comes from the workbook itself; only the type,
    which the sheet does not carry, is supplied here.
    """

    borehole_type: str = "BH"
    workbook: ImportedWorkbook
