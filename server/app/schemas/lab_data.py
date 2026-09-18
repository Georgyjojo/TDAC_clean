from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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