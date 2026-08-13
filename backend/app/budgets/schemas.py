from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class BudgetCreate(BaseModel):
    kind: Literal["spending_limit", "savings_goal"]
    category_id: int | None = None
    target_amount: Decimal
    period_start: date
    period_end: date


class BudgetOut(BaseModel):
    id: int
    kind: str
    category_id: int | None
    target_amount: Decimal
    period_start: date
    period_end: date

    # Computed, not stored — always fresh against current transactions
    actual_amount: Decimal
    progress_pct: float
    status: str
