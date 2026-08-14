from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)

from ..core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)

    amount = Column(Numeric(12, 2), nullable=False)  # positive = income, negative = expense
    txn_date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
    source = Column(String, nullable=False, default="manual")  # "manual" | "csv_import"

    # sha256 of (user_id, date, amount, description) — catches duplicate CSV rows
    dedupe_hash = Column(String, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_hash", name="uq_user_dedupe_hash"),
    )
