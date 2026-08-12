from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user_id, verify_clerk_token
from ..core.database import get_db
from .models import User
from .schemas import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(
    payload: dict = Depends(verify_clerk_token),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Returns the caller's local profile, creating it on first sight.
    Every other router (transactions, budgets, etc.) should depend on
    get_current_user_id the same way and scope its queries to that id.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            email=payload.get("email"),
            display_name=payload.get("name") or payload.get("email"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
