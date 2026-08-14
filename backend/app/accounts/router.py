from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..users.dependencies import require_local_user
from .schemas import AccountCreate, AccountResponse
from .service import create_account, get_user_accounts

router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"],
)


@router.post("", response_model=AccountResponse)
def add_account(
    account_data: AccountCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_local_user),
):
    return create_account(db, account_data, user_id)


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    user_id: str = Depends(require_local_user),
):
    return get_user_accounts(db, user_id)
