from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..users.dependencies import require_local_user
from .schemas import AccountCreate, AccountResponse, AccountUpdate
from .service import create_account, delete_account, get_user_accounts, update_account

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


@router.patch("/{account_id}", response_model=AccountResponse)
def edit_account(
    account_id: int,
    account_data: AccountUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_local_user),
):
    account = update_account(db, user_id, account_id, account_data)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.delete("/{account_id}", status_code=204)
def remove_account(
    account_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_local_user),
):
    deleted = delete_account(db, user_id, account_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Account not found")
