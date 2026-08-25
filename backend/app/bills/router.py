from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..users.dependencies import require_local_user
from .models import Bill
from .schemas import BillCreate, BillOut, BillStatusUpdate

router = APIRouter(
    prefix="/bills",
    tags=["bills"],
)


@router.post("", response_model=BillOut)
def create_bill(
    payload: BillCreate,
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    bill = Bill(
        user_id=user_id,
        name=payload.name,
        amount=payload.amount,
        due_date=payload.due_date,
        reminder_days_before=payload.reminder_days_before,
        status="PENDING",
    )

    db.add(bill)
    db.commit()
    db.refresh(bill)

    return bill


@router.get("", response_model=list[BillOut])
def list_bills(
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Bill)
        .filter(Bill.user_id == user_id)
        .order_by(Bill.due_date.asc())
        .all()
    )

@router.get("/upcoming")
def upcoming_bills(
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    next_30_days = today + timedelta(days=30)

    bills = (
        db.query(Bill)
        .filter(
            Bill.user_id == user_id,
            Bill.status == "PENDING",
            Bill.due_date <= next_30_days,
        )
        .order_by(Bill.due_date.asc())
        .all()
    )

    result = []

    for bill in bills:
        days_left = (bill.due_date - today).days

        if days_left < 0:
            reminder_status = "OVERDUE"
        elif days_left <= bill.reminder_days_before:
            reminder_status = "DUE_SOON"
        else:
            reminder_status = "UPCOMING"

        result.append(
            {
                "id": bill.id,
                "name": bill.name,
                "amount": bill.amount,
                "due_date": bill.due_date,
                "days_left": days_left,
                "reminder_status": reminder_status,
                "status": bill.status,
            }
        )

    return result
@router.patch("/{bill_id}", response_model=BillOut)
def update_bill_status(
    bill_id: int,
    payload: BillStatusUpdate,
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    bill = (
        db.query(Bill)
        .filter(
            Bill.id == bill_id,
            Bill.user_id == user_id,
        )
        .first()
    )

    if not bill:
        raise HTTPException(
            status_code=404,
            detail="Bill not found",
        )

    if payload.status not in {"PENDING", "PAID"}:
        raise HTTPException(
            status_code=400,
            detail="Status must be PENDING or PAID",
        )

    bill.status = payload.status

    db.commit()
    db.refresh(bill)

    return bill


