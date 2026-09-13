from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.auth.security import decode_access_token
from app.auth.user_service import get_user_by_id


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    token_gen = payload.get("token_gen")

    if user_id is None or token_gen is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )

    try:
        user_id = int(user_id)
        token_gen = int(token_gen)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )

    user = await get_user_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User no longer exists",
        )

    # Reject tokens belonging to deactivated users.
    if not user["is_active"]:
        raise HTTPException(
            status_code=401,
            detail="User account is inactive",
        )

    # Reject tokens issued before logout, password/security changes,
    # or account status changes.
    if token_gen != user["token_gen"]:
        raise HTTPException(
            status_code=401,
            detail="Token has been revoked",
        )

    return user


async def get_current_admin(
    current_user: dict = Depends(get_current_user),
):
    if current_user["role_name"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return current_user