from sqlalchemy import Column, String, DateTime, func

from ..core.database import Base


class User(Base):
    """
    Local mirror of a Clerk identity. Clerk remains the source of truth for
    auth (password, sessions, MFA); this row exists so the rest of the app
    (transactions, budgets, goals...) has something to foreign-key against
    without calling out to Clerk on every request.
    """

    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # Clerk's `sub` claim
    email = Column(String, unique=True, index=True, nullable=True)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
