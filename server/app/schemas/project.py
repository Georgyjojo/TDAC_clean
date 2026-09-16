from datetime import date
from decimal import Decimal

from typing import Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    project_id: str = Field(min_length=1)
    project_name: str = Field(min_length=1)
    project_location: str = Field(min_length=1)
    project_client: str = Field(min_length=1)

    borehole_id: str = Field(min_length=1)
    borehole_type: str = Field(min_length=1)

    start_date: date
    end_date: date

    final_depth: Decimal = Field(gt=0)

class ProjectUpdate(BaseModel):
    project_name: str = Field(min_length=1)
    project_location: str = Field(min_length=1)
    project_client: str = Field(min_length=1)

class LocaCreate(BaseModel):
    loca_id: str =Field(min_length=1)
    loca_type: str =Field(min_length=1)
    start_date: date | None = None
    end_date: date | None = None
    final_depth: Optional[Decimal] = Field(default=None, gt=0)