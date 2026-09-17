from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user
from app.schemas.field_data import (
    BoreholeRecordCreate,
    BoreholeRecordUpdate,
    SPTRecordCreate,
    SPTRecordUpdate,
    SamplingRecordCreate,
    SamplingRecordUpdate,
)
from app.field_data_service import (
    DuplicateRecordError,
    loca_belongs_to_project,
    get_borehole_records,
    create_borehole_record,
    update_borehole_record,
    get_spt_records,
    create_spt_record,
    update_spt_record,
    get_sampling_records,
    create_sampling_record,
    update_sampling_record,
    get_project_samples,
)


router = APIRouter(
    prefix="/api/portfolio/projects/{project_id}/locas/{loca_id}/field-data",
    tags=["Field Data"],
)


async def _require_loca(project_id: str, loca_id: str):
    if not await loca_belongs_to_project(project_id, loca_id):
        raise HTTPException(
            status_code=404,
            detail="This location does not belong to the selected project.",
        )


# ---------------------------------------------------------------------------
# Borehole / Drilling
# ---------------------------------------------------------------------------

@router.get("/borehole")
async def borehole_records(
    project_id: str,
    loca_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    rows = await get_borehole_records(project_id, loca_id)

    return {
        "project_id": project_id,
        "loca_id": loca_id,
        "records": [
            {
                "depth_from": row["depth_from"],
                "depth_to": row["depth_to"],
                "soil_description": row["soil_description"],
                "sand_clay": row["sand_clay"],
                "avg_n_value": (
                    # AVG(Numeric) is already exact; float() would only
                    # re-introduce binary error on an average of clean
                    # decimals (e.g. 5.5, 5.5 -> 5.5). Keep the Decimal.
                    row["avg_n_value"]
                    if row["avg_n_value"] is not None
                    else None
                ),
            }
            for row in rows
        ],
    }


@router.post("/borehole", status_code=201)
async def add_borehole(
    project_id: str,
    loca_id: str,
    payload: BoreholeRecordCreate,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    try:
        created = await create_borehole_record(
            project_id=project_id,
            loca_id=loca_id,
            depth_from=payload.depth_from,
            depth_to=payload.depth_to,
            soil_description=payload.soil_description,
            sand_clay=payload.sand_clay,
        )
    except DuplicateRecordError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return {
        "message": "Borehole record created successfully",
        "record": {
            "depth_from": created["depth_from"],
            "depth_to": created["depth_to"],
            "soil_description": created["soil_description"],
            "sand_clay": created["sand_clay"],
            "avg_n_value": None,
        },
    }


@router.patch("/borehole/{depth_from}")
async def update_borehole(
    project_id: str,
    loca_id: str,
    depth_from: Decimal,
    payload: BoreholeRecordUpdate,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    updated = await update_borehole_record(
        project_id=project_id,
        loca_id=loca_id,
        original_depth_from=depth_from,
        depth_from=payload.depth_from,
        depth_to=payload.depth_to,
        soil_description=payload.soil_description,
        sand_clay=payload.sand_clay,
    )

    if updated is None:
        raise HTTPException(status_code=404, detail="Borehole record not found.")

    return {
        "message": "Borehole record updated successfully",
        "record": {
            "depth_from": updated["depth_from"],
            "depth_to": updated["depth_to"],
            "soil_description": updated["soil_description"],
            "sand_clay": updated["sand_clay"],
        },
    }


# ---------------------------------------------------------------------------
# SPT
# ---------------------------------------------------------------------------

@router.get("/spt")
async def spt_records(
    project_id: str,
    loca_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    rows = await get_spt_records(project_id, loca_id)

    return {
        "project_id": project_id,
        "loca_id": loca_id,
        "records": [
            {
                "spt_depth": row["spt_depth"],
                "blows_15": row["blows_15"],
                "blows_30": row["blows_30"],
                "blows_45": row["blows_45"],
                "n_value": row["n_value"],
            }
            for row in rows
        ],
    }


@router.post("/spt", status_code=201)
async def add_spt(
    project_id: str,
    loca_id: str,
    payload: SPTRecordCreate,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    try:
        created = await create_spt_record(
            project_id=project_id,
            loca_id=loca_id,
            spt_depth=payload.spt_depth,
            blows_15=payload.blows_15,
            blows_30=payload.blows_30,
            blows_45=payload.blows_45,
            n_value=payload.n_value,
        )
    except DuplicateRecordError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return {
        "message": "SPT record created successfully",
        "record": {
            "spt_depth": created["spt_depth"],
            "blows_15": created["blows_15"],
            "blows_30": created["blows_30"],
            "blows_45": created["blows_45"],
            "n_value": created["n_value"],
        },
    }


@router.patch("/spt/{spt_depth}")
async def update_spt(
    project_id: str,
    loca_id: str,
    spt_depth: Decimal,
    payload: SPTRecordUpdate,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    updated = await update_spt_record(
        project_id=project_id,
        loca_id=loca_id,
        original_spt_depth=spt_depth,
        spt_depth=payload.spt_depth,
        blows_15=payload.blows_15,
        blows_30=payload.blows_30,
        blows_45=payload.blows_45,
        n_value=payload.n_value,
    )

    if updated is None:
        raise HTTPException(status_code=404, detail="SPT record not found.")

    return {
        "message": "SPT record updated successfully",
        "record": {
            "spt_depth": updated["spt_depth"],
            "blows_15": updated["blows_15"],
            "blows_30": updated["blows_30"],
            "blows_45": updated["blows_45"],
            "n_value": updated["n_value"],
        },
    }


# ---------------------------------------------------------------------------
# Sampling / Coring
# ---------------------------------------------------------------------------

@router.get("/sampling")
async def sampling_records(
    project_id: str,
    loca_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    rows = await get_sampling_records(project_id, loca_id)

    return {
        "project_id": project_id,
        "loca_id": loca_id,
        "records": [
            {
                "sample_id": row["sample_id"],
                "depth_from": row["depth_from"],
                "depth_to": row["depth_to"],
                "rock_description": row["rock_description"],
                "recovery": row["recovery"],
                "rqd": row["rqd"],
                "remark": row["remark"],
            }
            for row in rows
        ],
    }


@router.post("/sampling", status_code=201)
async def add_sampling(
    project_id: str,
    loca_id: str,
    payload: SamplingRecordCreate,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    try:
        created = await create_sampling_record(
            project_id=project_id,
            loca_id=loca_id,
            depth_from=payload.depth_from,
            depth_to=payload.depth_to,
            recovery=payload.recovery,
            rqd=payload.rqd,
            remark=payload.remark,
        )
    except DuplicateRecordError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return {
        "message": "Sampling/coring record created successfully",
        "record": created,
    }


@router.patch("/sampling/{depth_from}")
async def update_sampling(
    project_id: str,
    loca_id: str,
    depth_from: Decimal,
    payload: SamplingRecordUpdate,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    updated = await update_sampling_record(
        project_id=project_id,
        loca_id=loca_id,
        original_depth_from=depth_from,
        depth_from=payload.depth_from,
        depth_to=payload.depth_to,
        rock_description=payload.rock_description,
        recovery=payload.recovery,
        rqd=payload.rqd,
        remark=payload.remark,
    )

    if updated is None:
        raise HTTPException(status_code=404, detail="Sampling/coring record not found.")

    return {
        "message": "Sampling/coring record updated successfully",
        "record": updated,
    }

@router.get("/samples")
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

# ---------------------------------------------------------------------------
# Groundwater
#
# No AGS4 group/column mapping for Groundwater was supplied or could be
# confirmed from the existing codebase or schema. Per the task's explicit
# instruction not to invent a mapping, this endpoint reports the module as
# unavailable instead of returning guessed or fabricated data.
# ---------------------------------------------------------------------------

@router.get("/groundwater")
async def groundwater_records(
    project_id: str,
    loca_id: str,
    current_user: dict = Depends(get_current_user),
):
    await _require_loca(project_id, loca_id)

    return {
        "project_id": project_id,
        "loca_id": loca_id,
        "available": False,
        "reason": (
            "Groundwater data mapping has not been configured for this "
            "database yet."
        ),
        "records": [],
    }
