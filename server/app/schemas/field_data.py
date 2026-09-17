"""
Field Data schemas.

Field Data is sourced from the AGS4 geotechnical tables that already back
the rest of the application (see app/portfolio_service.py, which reads
"ags42"."PROJ" and "ags42"."LOCA"). The column mapping below is fixed by
the application's data contract and must not be changed:

    Borehole / Drilling
        depth_from        -> GEOL.GEOL_TOP
        depth_to          -> GEOL.GEOL_BASE
        soil_description  -> GEOL.GEOL_DESC
        sand_clay         -> GEOL.GEOL_GEOL
        avg_n_value       -> derived from ISPT.ISPT_NVAL (see field_data_service)

    Sampling / Coring
        depth_from        -> CORE.CORE_TOP
        depth_to          -> CORE.CORE_BASE
        rock_description  -> GEOL.GEOL_DESC (same source column as Soil Description)
        recovery          -> CORE.CORE_PREC
        rqd               -> CORE.CORE_RQD
        remark            -> CORE.CORE_REM

    SPT
        spt_depth  -> ISPT.ISPT_TOP
        blows_15   -> ISPT.ISPT_INC1
        blows_30   -> ISPT.ISPT_INC2
        blows_45   -> ISPT.ISPT_INC3
        n_value    -> ISPT.ISPT_NVAL
"""

from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class BoreholeRecord(BaseModel):
    depth_from: Decimal
    depth_to: Optional[Decimal] = None
    soil_description: Optional[str] = None
    sand_clay: Optional[str] = None
    avg_n_value: Optional[Decimal] = None


class BoreholeRecordUpdate(BaseModel):
    """Payload for editing a Borehole / Drilling (GEOL) record.

    depth_from is included because the user may edit the "Depth From"
    value itself; the *current* depth_from used to identify which row to
    update is taken from the URL path, not from this body.
    """

    depth_from: Decimal
    depth_to: Optional[Decimal] = None
    soil_description: Optional[str] = None
    sand_clay: Optional[str] = None


class BoreholeRecordCreate(BaseModel):
    """Payload for adding a new Borehole / Drilling (GEOL) record.

    avg_n_value is intentionally excluded — it is a derived/computed
    value (see field_data_service.get_borehole_records), not a real
    column, so it cannot be created directly.
    """

    depth_from: Decimal
    depth_to: Optional[Decimal] = None
    soil_description: Optional[str] = None
    sand_clay: Optional[str] = None


class SPTRecord(BaseModel):
    spt_depth: Decimal
    blows_15: Optional[Decimal] = None
    blows_30: Optional[Decimal] = None
    blows_45: Optional[Decimal] = None
    n_value: Optional[Decimal] = None


class SPTRecordUpdate(BaseModel):
    spt_depth: Decimal
    blows_15: Optional[Decimal] = None
    blows_30: Optional[Decimal] = None
    blows_45: Optional[Decimal] = None
    n_value: Optional[Decimal] = None


class SPTRecordCreate(BaseModel):
    spt_depth: Decimal
    blows_15: Optional[Decimal] = None
    blows_30: Optional[Decimal] = None
    blows_45: Optional[Decimal] = None
    n_value: Optional[Decimal] = None


class SamplingRecord(BaseModel):
    depth_from: Decimal
    depth_to: Optional[Decimal] = None
    rock_description: Optional[str] = None
    recovery: Optional[Decimal] = None
    rqd: Optional[Decimal] = None
    remark: Optional[str] = None


class SamplingRecordUpdate(BaseModel):
    depth_from: Decimal
    depth_to: Optional[Decimal] = None
    # Sourced from GEOL.GEOL_DESC (shared with Borehole / Drilling). Editing
    # it here updates the underlying geology interval that overlaps this
    # sample run, same as editing "Soil Description" on the Borehole tab.
    rock_description: Optional[str] = None
    recovery: Optional[Decimal] = None
    rqd: Optional[Decimal] = None
    remark: Optional[str] = None


class SamplingRecordCreate(BaseModel):
    """Payload for adding a new Sampling / Coring (CORE) record.

    rock_description is intentionally excluded — CORE has no column for
    it (it is only ever sourced from an overlapping GEOL interval, which
    a brand-new sample run will not yet have). Add/edit the geology
    interval from the Borehole / Drilling tab instead.
    """

    depth_from: Decimal
    depth_to: Optional[Decimal] = None
    recovery: Optional[Decimal] = None
    rqd: Optional[Decimal] = None
    remark: Optional[str] = None
