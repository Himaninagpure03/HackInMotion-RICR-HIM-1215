from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    amount: Decimal
    txn_date: date
    description: str = Field(min_length=1)
    account_id: int | None = None


class TransactionUpdate(BaseModel):
    category_id: int | None = None


class TransactionOut(BaseModel):
    id: int
    amount: Decimal
    txn_date: date
    description: str
    category_id: int | None
    account_id: int | None
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
