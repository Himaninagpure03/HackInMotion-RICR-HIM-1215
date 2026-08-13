from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func

from ..core.database import Base


class AnalysisSnapshot(Base):
    __tablename__ = "analysis_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    period_label = Column(String, nullable=False)  # e.g. "2026-08", human-readable month key
    health_score = Column(Integer, nullable=False)
    savings_rate = Column(Numeric(6, 2), nullable=False)  # percent, e.g. 12.50
    total_income = Column(Numeric(12, 2), nullable=False)
    total_expenses = Column(Numeric(12, 2), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
