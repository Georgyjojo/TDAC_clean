#Authentication specific schema only
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str
