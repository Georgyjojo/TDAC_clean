from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user
from app.portfolio_service import (
    get_portfolio_summary,
    get_project_locas,
    get_project,
    create_project,
    create_project_loca,
    update_project,
)
from app.schemas.project import ProjectCreate, ProjectUpdate, LocaCreate


router = APIRouter(
    prefix="/api/portfolio",
    tags=["Portfolio"],
)


@router.get("/summary")
async def portfolio_summary(
    current_user: dict = Depends(get_current_user),
):
    return await get_portfolio_summary()


@router.post("/projects")
async def create_project_record(
    project: ProjectCreate,
    current_user: dict = Depends(get_current_user),
):
    try:
        created_project = await create_project(
            project_number=project.project_number,
            project_name=project.project_name,
            country_region=project.country_region,
            client=project.client,
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
    }

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