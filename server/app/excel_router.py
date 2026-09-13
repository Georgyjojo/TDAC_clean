"""
Excel import endpoints.

Three routes serve both import flows:

  POST /api/excel/workbook
      Shared parser: upload any input-sheet variant, get back the parsed
      workbook plus suggested form values. Used by BOTH the Add New Project
      page and the Overview import so parsing lives in exactly one place.

  POST /api/excel/projects
      Add New Project commit: creates the project, its first borehole, and
      every Borelog / Rock profile / SPT row in one transaction.

  POST /api/excel/projects/{project_id}/locas
      Overview commit: adds the workbook's borehole to an EXISTING project.
      Fails when the project does not exist, when the workbook states a
      different project id, or when the location already exists.

Nothing is written by the parse route; the browser never sends raw file
bytes twice (the parsed workbook travels back inside the commit body).
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth.dependencies import get_current_user
from app.excel_import_service import (
    ImportConflictError,
    ProjectNotFoundError,
    import_loca_from_workbook,
    import_project_from_workbook,
)
from app.excel_parser import ExcelImportError, parse_input_sheet
from app.schemas.excel_import import LocaExcelImport, ProjectExcelImport

router = APIRouter(
    prefix="/api/excel",
    tags=["Excel Import"],
)

# Uploads are parsed from bytes and never spooled to disk; a cap keeps a
# stray huge file from pinning phone memory. Real input sheets are < 100 KB.
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024


@router.post("/workbook")
async def parse_workbook(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    data = await file.read()

    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="The workbook is larger than 5 MB.",
        )

    if not data:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        parsed = parse_input_sheet(data)
    except ExcelImportError as error:
        raise HTTPException(status_code=400, detail=error.message) from None

    info = parsed["project_info"]

    return {
        "workbook": parsed,
        "suggestions": {
            "project_name": info.get("project_type"),
            "project_location": info.get("project_location"),
            "project_client": info.get("client_name"),
            "borehole_id": info.get("borehole_number"),
            "start_date": info.get("start_date"),
            "end_date": info.get("end_date"),
            "final_depth": info.get("final_depth"),
        },
    }


@router.post("/projects")
async def create_project_from_excel(
    payload: ProjectExcelImport,
    current_user: dict = Depends(get_current_user),
):
    info = payload.workbook.project_info

    if info.start_date and info.end_date and info.end_date < info.start_date:
        raise HTTPException(
            status_code=400,
            detail="Drilling end date cannot be before the start date.",
        )

    borehole_id = payload.borehole_id or info.borehole_number
    if not borehole_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "No borehole ID was given on the form or found on the "
                "workbook's ProjectInfo sheet."
            ),
        )

    try:
        result = await import_project_from_workbook(
            project_id=payload.project_id,
            project_name=payload.project_name,
            project_location=(
                payload.project_location or info.project_location
            ),
            project_client=(
                payload.project_client or info.client_name
            ),
            borehole_id=borehole_id,
            borehole_type=payload.borehole_type,
            start_date=payload.start_date or info.start_date,
            end_date=payload.end_date or info.end_date,
            final_depth=payload.final_depth or info.final_depth,
            workbook=payload.workbook.model_dump(),
        )
    except ImportConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from None
    except Exception as error:
        error_text = str(error)

        if "duplicate key" in error_text.lower():
            raise HTTPException(
                status_code=409,
                detail="This project or location already exists.",
            ) from None

        print(f"Excel project import error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Unable to import this workbook.",
        ) from None

    return {
        "message": "Project imported successfully",
        **result,
    }


@router.post("/projects/{project_id}/locas")
async def create_loca_from_excel(
    project_id: str,
    payload: LocaExcelImport,
    current_user: dict = Depends(get_current_user),
):
    info = payload.workbook.project_info

    if not info.borehole_number:
        raise HTTPException(
            status_code=400,
            detail=(
                "The workbook's ProjectInfo sheet does not name a borehole."
            ),
        )

    # A workbook may state which project it belongs to. When it does, that
    # id must match the open project, otherwise the file belongs elsewhere.
    if info.project_id and info.project_id != project_id:
        raise HTTPException(
            status_code=409,
            detail=(
                f"This workbook belongs to project {info.project_id}, not"
                f" {project_id}."
            ),
        )

    if info.start_date and info.end_date and info.end_date < info.start_date:
        raise HTTPException(
            status_code=400,
            detail="Drilling end date cannot be before the start date.",
        )

    try:
        result = await import_loca_from_workbook(
            project_id=project_id,
            borehole_id=info.borehole_number,
            borehole_type=payload.borehole_type,
            start_date=info.start_date,
            end_date=info.end_date,
            final_depth=info.final_depth,
            workbook=payload.workbook.model_dump(),
        )
    except ProjectNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from None
    except ImportConflictError as error:
        raise HTTPException(status_code=409, detail=str(error)) from None
    except Exception as error:
        error_text = str(error)

        if "duplicate key" in error_text.lower():
            raise HTTPException(
                status_code=409,
                detail="This location already exists in this project.",
            ) from None

        print(f"Excel loca import error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Unable to import this workbook.",
        ) from None

    return {
        "message": "Location imported successfully",
        **result,
    }
