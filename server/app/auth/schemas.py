#Authentication specific schema only
from pydantic import BaseModel, field_validator

class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    """Self-service password change from the Topbar account menu.

    The current password proves identity; new + confirm must match so
    the server can reject typos before anything is written.
    """

    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, confirm, info):
        new = info.data.get("new_password")
        if new is not None and confirm != new:
            raise ValueError("New passwords do not match")
        return confirm
