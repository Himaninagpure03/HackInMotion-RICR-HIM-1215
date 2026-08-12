from fastapi import Depends
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user_id, verify_clerk_token
from ..core.database import get_db
from .service import get_or_create_user


def require_local_user(
    payload: dict = Depends(verify_clerk_token),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> str:

    get_or_create_user(
        db,
        user_id,
        email=payload.get("email"),
        display_name=payload.get("name") or payload.get("email"),
    )
    return user_id
