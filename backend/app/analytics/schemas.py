from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CategoryBreakdown(BaseModel):
    category: str
    total: Decimal


class MonthlyTrendPoint(BaseModel):
    month: str  # "2026-08"
    income: Decimal
    expenses: Decimal


class HealthScoreOut(BaseModel):
    score: int  # 0-100
    savings_rate: float  # percent, e.g. 12.5
    total_income: Decimal
    total_expenses: Decimal
    recommendations: list[str]


class DashboardOut(BaseModel):
    category_breakdown: list[CategoryBreakdown]
    monthly_trend: list[MonthlyTrendPoint]
    health: HealthScoreOut


class SnapshotOut(BaseModel):
    id: int
    period_label: str
    health_score: int
    savings_rate: Decimal
    total_income: Decimal
    total_expenses: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
