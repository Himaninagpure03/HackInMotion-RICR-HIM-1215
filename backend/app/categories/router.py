from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user_id
from ..core.database import get_db
from .models import Category
from .schemas import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    _: str = Depends(get_current_user_id),  # any authenticated user can read the shared list
    db: Session = Depends(get_db),
):
    return db.query(Category).order_by(Category.name).all()
