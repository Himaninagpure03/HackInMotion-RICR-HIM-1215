from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from ..core.database import Base


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    institution = Column(String(100), nullable=True)
    last_four_digits = Column(String(4), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
