from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..users.dependencies import require_local_user
from .models import Budget
from .schemas import BudgetCreate, BudgetOut
from .service import budget_status, compute_actual

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _to_out(db: Session, user_id: str, budget: Budget) -> BudgetOut:
    actual = compute_actual(db, user_id, budget)
    progress_pct = float(actual / budget.target_amount * 100) if budget.target_amount else 0.0

    return BudgetOut(
        id=budget.id,
        kind=budget.kind,
        category_id=budget.category_id,
        target_amount=budget.target_amount,
        period_start=budget.period_start,
        period_end=budget.period_end,
        actual_amount=actual,
        progress_pct=round(progress_pct, 1),
        status=budget_status(budget, actual),
    )


@router.post("", response_model=BudgetOut)
def create_budget(
    payload: BudgetCreate,
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    budget = Budget(user_id=user_id, **payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _to_out(db, user_id, budget)


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    return [_to_out(db, user_id, b) for b in budgets]
