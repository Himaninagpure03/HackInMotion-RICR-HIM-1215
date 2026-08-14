from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BillCreate(BaseModel):
    name: str
    amount: Decimal
    due_date: date
    reminder_days_before: int = 3


class BillOut(BaseModel):
    id: int
    name: str
    amount: Decimal
    due_date: date
    reminder_days_before: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BillStatusUpdate(BaseModel):
    status: str