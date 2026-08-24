from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..accounts.models import Account
from ..categories.models import Category
from ..core.config import settings
from ..core.database import get_db
from ..users.dependencies import require_local_user
from .categorizer import categorize
from .csv_import import import_transactions_csv
from .dedupe import compute_dedupe_hash
from .models import Transaction
from .schemas import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _validate_account(db: Session, user_id: str, account_id: int | None) -> None:
    """A user must not be able to tag a transaction onto someone else's account."""
    if account_id is None:
        return
    owned = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not owned:
        raise HTTPException(status_code=404, detail="Account not found")


@router.post("", response_model=TransactionOut)
def create_transaction(
    payload: TransactionCreate,
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    _validate_account(db, user_id, payload.account_id)

    dedupe_hash = compute_dedupe_hash(
        user_id, payload.txn_date, payload.amount, payload.description, payload.account_id
    )

    # Same (user, account, date, amount, description) already exists — treat
    # as a no-op rather than erroring, so double-submits and CSV re-imports
    # don't need special-case handling by the caller.
    existing = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.dedupe_hash == dedupe_hash)
        .first()
    )
    if existing:
        return existing

    category_name = categorize(payload.description)
    category = (
        db.query(Category).filter(Category.name == category_name).first() if category_name else None
    )

    txn = Transaction(
        user_id=user_id,
        account_id=payload.account_id,
        category_id=category.id if category else None,
        amount=payload.amount,
        txn_date=payload.txn_date,
        description=payload.description,
        source="manual",
        dedupe_hash=dedupe_hash,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    account_id: int | None = None,
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    """Pass ?account_id=N to view a single account; omit it for the unified
    view across all accounts."""
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if account_id is not None:
        query = query.filter(Transaction.account_id == account_id)
    return query.order_by(Transaction.txn_date.desc()).all()


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    """Lets a user correct the auto-categorizer's guess (or the assigned
    account) on a specific transaction."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    updates = payload.model_dump(exclude_unset=True)

    if updates.get("account_id") is not None:
        _validate_account(db, user_id, payload.account_id)

    if updates.get("category_id") is not None:
        category = db.query(Category).filter(Category.id == payload.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

    if "category_id" in updates:
        txn.category_id = payload.category_id

    if "account_id" in updates:
        txn.account_id = payload.account_id
        txn.dedupe_hash = compute_dedupe_hash(
            user_id, txn.txn_date, txn.amount, txn.description, payload.account_id
        )

    db.commit()
    db.refresh(txn)
    return txn


@router.post("/import")
async def import_transactions(
    file: UploadFile = File(...),
    account_id: int | None = Form(None),
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    """
    Bulk-imports a bank-statement-shaped CSV. Reuses the same categorization
    and dedup logic as manual entry, so re-uploading the same statement (or
    one that overlaps a prior import) is safe — duplicates are skipped, not
    double-counted. Pass account_id in the form data to tag every imported
    row to a specific account.
    """
    _validate_account(db, user_id, account_id)

    # Read in chunks so an oversized upload is rejected before it can exhaust
    # memory. Content-Length alone can't be trusted (proxies may not forward
    # it), and Starlette's UploadFile.size isn't guaranteed to be set.
    max_bytes = settings.max_upload_bytes
    if file.size is not None and file.size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"CSV file too large (limit: {max_bytes // (1024 * 1024)} MB)",
        )

    buffer = bytearray()
    while chunk := await file.read(512 * 1024):
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"CSV file too large (limit: {max_bytes // (1024 * 1024)} MB)",
            )
    contents = bytes(buffer)

    result = import_transactions_csv(db, user_id, contents, account_id=account_id)
    return {
        "imported": result.imported,
        "skipped_duplicates": result.skipped_duplicates,
        "errors": result.errors,
    }
