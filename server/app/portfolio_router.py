from fastapi import APIRouter, Depends, HTTPException

from app.schemas.lab_data import LabTestCreate
from app.lab_data_service import (
    create_lab_test,
    get_project_lab_tests,
)
from app.auth.dependencies import get_current_user
from app.portfolio_service import (
    get_portfolio_summary,
    get_project_locas,
    get_project,
    create_project,
    create_project_loca,
    create_project_metadata,
    get_project_id_preview,
    update_project,
    allocate_project_id,
    get_project_metadata,
    update_project_overview,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    LocaCreate,
    ProjectOverviewUpdate
)
from app.field_data_service import (
    get_project_samples,
    get_project_sample_tests,
)

router = APIRouter(
    prefix="/api/portfolio",
    tags=["Portfolio"],
)


@router.get("/summary")
async def portfolio_summary(
    current_user: dict = Depends(get_current_user),
):
    return await get_portfolio_summary()

@router.get("/projects/next-id")
async def get_next_project_id(
    current_user: dict = Depends(get_current_user),
):
    try:
        project_id = await get_project_id_preview()

        return {
            "project_id": project_id
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate project ID: {exc}",
        )

@router.post("/projects")
async def create_project_record(
    project: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    project_number = project.project_id
    if project_number.upper() == "AUTO":
        project_number = await allocate_project_id()
    try:
        created_project = await create_project(
            project_number = project_number,
            project_name = project.project_name,
            country_region = project.project_location,
            client = project.project_client,
            consultant_name = project.consultant_name,
            contractor_name = project.contractor_name
        )

        if project.metadata is not None:
            await create_project_metadata(
                project_id=project_number,
                road_reference=project.metadata.road_reference,
                chainage_text=project.metadata.chainage_text,
                structure_reference=project.metadata.structure_reference,
                selected_boreholes=project.metadata.selected_boreholes,
                report_type=project.metadata.report_type,
                report_title=project.metadata.report_title,
                report_volume_title=project.metadata.report_volume_title,
                document_reference=project.metadata.document_reference,
                revision=project.metadata.revision,
                report_date=project.metadata.report_date,
                issue_status=project.metadata.issue_status,
                tdac_company_name=project.metadata.tdac_company_name,
                groundwater_basis=project.metadata.groundwater_basis,
                design_standard_basis=project.metadata.design_standard_basis,
                factor_of_safety_basis=project.metadata.factor_of_safety_basis,
                load_combination_basis=project.metadata.load_combination_basis,
                construction_verification_requirement=(
                    project.metadata.construction_verification_requirement
                ),
                pile_load_test_requirement=(
                    project.metadata.pile_load_test_requirement
                ),
            )

    except Exception as error:
        error_text = str(error)

        if "duplicate key" in error_text.lower():
            raise HTTPException(
                status_code=409,
                detail="A project with this project number already exists.",
            )

        print(f"Project creation error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Unable to create project.",
        )

    return {
        "message": "Project created successfully",
        "project": {
            "project_number": created_project["PROJ_ID"],
            "project_name": created_project["PROJ_NAME"],
            "country_region": created_project["PROJ_LOC"],
            "client": created_project["PROJ_CLNT"],
        },
    }

@router.patch("/projects/{project_id}/overview")
async def update_project_overview_endpoint(
    project_id: str,
    project: ProjectOverviewUpdate,
    current_user: dict = Depends(get_current_user),
):
    try:
        updated_project = await update_project_overview(
            project_id=project_id,
            project_name=project.project_name,
            project_location=project.project_location,
            project_client=project.project_client,
            consultant_name=project.consultant_name,
            contractor_name=project.contractor_name,
            road_reference=project.road_reference,
            chainage_text=project.chainage_text,
            structure_reference=project.structure_reference,
            selected_boreholes=project.selected_boreholes,
            report_type=project.report_type,
            report_title=project.report_title,
            report_volume_title=project.report_volume_title,
            document_reference=project.document_reference,
            revision=project.revision,
            report_date=project.report_date,
            issue_status=project.issue_status,
            tdac_company_name=project.tdac_company_name,
            groundwater_basis=project.groundwater_basis,
            design_standard_basis=project.design_standard_basis,
            factor_of_safety_basis=project.factor_of_safety_basis,
            load_combination_basis=project.load_combination_basis,
            construction_verification_requirement=(
                project.construction_verification_requirement
            ),
            pile_load_test_requirement=(
                project.pile_load_test_requirement
            ),
        )

        if updated_project is None:
            raise HTTPException(
                status_code=404,
                detail="Project not found.",
            )

        return dict(updated_project)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update project overview: {exc}",
        )
    
@router.get("/projects/{project_id}")
async def project_record(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    project = await get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return {
        "project_id": project["PROJ_ID"],
        "project_name": project["PROJ_NAME"],
        "project_location": project["PROJ_LOC"],
        "project_client": project["PROJ_CLNT"],
        "consultant_name": project["PROJ_ENG"],
        "contractor_name": project["PROJ_CONT"],
    }

@router.get("/projects/{project_id}/metadata")
async def get_project_metadata_endpoint(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        metadata = await get_project_metadata(project_id)

        if metadata is None:
            raise HTTPException(
                status_code=404,
                detail="Project metadata not found.",
            )

        return dict(metadata)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load project metadata: {exc}",
        )
    
@router.patch("/projects/{project_id}")
async def update_project_record(
    project_id: str,
    project: ProjectUpdate,
    current_user: dict = Depends(get_current_user),
):
    updated_project = await update_project(
        project_id=project_id,
        project_name=project.project_name,
        project_location=project.project_location,
        project_client=project.project_client,
    )

    if updated_project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return {
        "message": "Project updated successfully",
        "project": {
            "project_id": updated_project["PROJ_ID"],
            "project_name": updated_project["PROJ_NAME"],
            "project_location": updated_project["PROJ_LOC"],
            "project_client": updated_project["PROJ_CLNT"],
        },
    }

@router.get("/projects/{project_id}/locas")
async def project_locas(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    locas = await get_project_locas(project_id)

    return {
        "project_id": project_id,
        "locas": [
            {
                "loca_id": loca["LOCA_ID"],
                "loca_type": loca["LOCA_TYPE"],
                "final_depth": loca["LOCA_FDEP"],
                "start_date": loca["LOCA_STAR"],
                "end_date": loca["LOCA_ENDD"],
                "project_id": loca["PROJ_ID"],
            }
            for loca in locas
        ],
    }

@router.post("/projects/{project_id}/locas")
async def create_project_loca_record(
    project_id: str,
    loca: LocaCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        created_loca = await create_project_loca(
            project_id=project_id,
            loca_id=loca.loca_id,
            loca_type=loca.loca_type,
            start_date=loca.start_date,
            end_date=loca.end_date,
            final_depth=loca.final_depth,
        )
    except Exception as error:
        error_text = str(error)

        if "duplicate key" in error_text.lower():
            raise HTTPException(
                status_code=500,
                detail="A location with this ID already exists.",
            )

        print(f"Location creation error: {error}")

        raise HTTPException(
            status_code=500,
            detail="Unable to create location.",
        )

    return {
        "message":"Location created successfully",
        "loca": {
            "loca_id": created_loca["LOCA_ID"],
            "loca_type": created_loca["LOCA_TYPE"],
            "final_depth": created_loca["LOCA_FDEP"],
            "start_date": created_loca["LOCA_STAR"],
            "end_date": created_loca["LOCA_ENDD"],
            "project_id": created_loca["PROJ_ID"],
        }
    }

@router.get("/projects/{project_id}/samples")
async def project_samples(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    rows = await get_project_samples(project_id)

    return {
        "project_id": project_id,
        "samples": [
            {
                "sample_id": row["sample_id"],
                "loca_id": row["loca_id"],
                "depth_from": row["depth_from"],
                "depth_to": row["depth_to"],
            }
            for row in rows
        ],
    }

@router.post("/projects/{project_id}/lab/tests", status_code=201)
async def create_project_lab_test(
    project_id: str,
    payload: LabTestCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        created = await create_lab_test(
            project_id=project_id,
            loca_id=payload.loca_id,
            samp_id=payload.samp_id,
            specimen_ref=payload.specimen_ref,
            test_type=payload.test_type,
            method_definition_id=payload.method_definition_id,
            laboratory=payload.laboratory,
            technician=payload.technician,
            test_started_at=payload.test_started_at,
            test_completed_at=payload.test_completed_at,
            created_by=current_user["username"],
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    return {
        "message": "Laboratory test created successfully",
        "test": {
            "test_id": str(created["test_id"]),
            "project_id": project_id,
            "loca_id": created["loca_id"],
            "samp_id": created["samp_id"],
            "spec_ref": created["spec_ref"],
            "test_type": created["test_type"],
            "method_definition_id": str(
                created["method_definition_id"]
            ),
            "laboratory": created["laboratory"],
            "technician": created["technician"],
            "status": created["status"],
            "current_revision": created["current_revision"],
            "row_version": created["row_version"],
        },
    }

@router.get("/projects/{project_id}/lab/tests")
async def project_lab_tests(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    rows = await get_project_lab_tests(project_id)

    return {
        "project_id": project_id,
        "tests": [
            {
                "test_id": str(row["test_id"]),
                "loca_id": row["loca_id"],
                "samp_id": row["samp_id"],
                "samp_top": row["samp_top"],
                "samp_base": row["samp_base"],
                "spec_ref": row["spec_ref"],
                "test_type": row["test_type"],
                "laboratory": row["laboratory"],
                "technician": row["technician"],
                "test_started_at": row["test_started_at"],
                "test_completed_at": row["test_completed_at"],
                "status": row["status"],
                "current_revision": row["current_revision"],
                "created_at": row["created_at"],
            }
            for row in rows
        ],
    }

@router.get("/projects/{project_id}/sample-tests")
async def project_sample_tests(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    rows = await get_project_sample_tests(project_id)

    return {
        "project_id": project_id,
        "samples": [
            {
                "sample_id": row["sample_id"],
                "loca_id": row["loca_id"],
                "test_id": (
                    str(row["test_id"])
                    if row["test_id"] is not None
                    else None
                ),
                "test_type": row["test_type"],
                "status": (
                    row["status"]
                    if row["status"] is not None
                    else "NOT_TESTED"
                ),
            }
            for row in rows
        ],
    }