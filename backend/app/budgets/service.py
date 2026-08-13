from decimal import Decimal

from sqlalchemy.orm import Session

from ..transactions.models import Transaction
from .models import Budget


def compute_actual(db: Session, user_id: str, budget: Budget) -> Decimal:
    query = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.txn_date >= budget.period_start,
        Transaction.txn_date <= budget.period_end,
    )
    if budget.category_id is not None:
        query = query.filter(Transaction.category_id == budget.category_id)

    txns = query.all()

    if budget.kind == "spending_limit":
        # Sum of expenses only, expressed as a positive number against the limit
        return sum((-t.amount for t in txns if t.amount < 0), Decimal("0"))
    else:  # savings_goal — net of everything in scope (income minus expenses)
        return sum((t.amount for t in txns), Decimal("0"))


def budget_status(budget: Budget, actual: Decimal) -> str:
    if budget.kind == "spending_limit":
        return "over" if actual > budget.target_amount else "on_track"
    return "reached" if actual >= budget.target_amount else "in_progress"
