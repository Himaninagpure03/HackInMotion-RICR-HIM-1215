from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..users.dependencies import require_local_user
from ..categories.models import Category
from ..core.database import get_db
from .categorizer import categorize
from .csv_import import import_transactions_csv
from .dedupe import compute_dedupe_hash
from .models import Transaction
from .schemas import TransactionCreate, TransactionOut

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionOut)
def create_transaction(
    payload: TransactionCreate,
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    dedupe_hash = compute_dedupe_hash(user_id, payload.txn_date, payload.amount, payload.description)

    # Same (user, date, amount, description) already exists — treat as a
    # no-op rather than erroring, so double-submits and CSV re-imports
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
        db.query(Category).filter(Category.name == category_name).first()
        if category_name
        else None
    )

    txn = Transaction(
        user_id=user_id,
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
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.txn_date.desc())
        .all()
    )


@router.post("/import")
async def import_transactions(
    file: UploadFile = File(...),
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    """
    Bulk-imports a bank-statement-shaped CSV. Reuses the same categorization
    and dedup logic as manual entry, so re-uploading the same statement (or
    one that overlaps a prior import) is safe — duplicates are skipped, not
    double-counted.
    """
    contents = await file.read()
    result = import_transactions_csv(db, user_id, contents)
    return {
        "imported": result.imported,
        "skipped_duplicates": result.skipped_duplicates,
        "errors": result.errors,
    }
