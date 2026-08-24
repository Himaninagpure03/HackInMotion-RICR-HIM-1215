from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)

from ..core.database import Base


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        String,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    name = Column(String, nullable=False)

    amount = Column(Numeric(12, 2), nullable=False)

    due_date = Column(Date, nullable=False, index=True)

    reminder_days_before = Column(
        Integer,
        nullable=False,
        default=3,
    )

    status = Column(
        String,
        nullable=False,
        default="PENDING",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
