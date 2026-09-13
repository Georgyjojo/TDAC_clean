#User management schema
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8,max_length=128)
    role_id: int

class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role_id: int | None = None

class UserResponse(BaseModel):
    id: int
    username: str
    role_id: int
    role_name: str
    is_active: bool