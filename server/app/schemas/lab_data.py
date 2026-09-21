from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class LabTestCreate(BaseModel):
    loca_id: str
    samp_id: str
    specimen_ref: str
    test_type: str
    method_definition_id: UUID
    laboratory: str
    technician: str | None = None
    test_started_at: datetime | None = None
    test_completed_at: datetime | None = None


class LabRevisionSave(BaseModel):
    """A calculated draft for one test revision.

    The snapshots are stored verbatim in lab.test_revision so the exact raw
    readings, calculation output and validation findings are reproducible.
    """

    raw_input_snapshot: dict[str, Any] = Field(default_factory=dict)
    calculation_output_snapshot: dict[str, Any] | None = None
    validation_snapshot: dict[str, Any] | None = None
    revision_reason: str | None = None


class LabReviewAction(BaseModel):
    reason: str | None = None