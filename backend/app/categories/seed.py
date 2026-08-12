from sqlalchemy.orm import Session

from .models import Category

DEFAULT_CATEGORIES = [
    "Food",
    "Groceries",
    "Rent",
    "Subscriptions",
    "Travel",
    "Bills",
    "Shopping",
    "Health",
    "Entertainment",
    "Income",
    "Other",
]


def seed_categories(db: Session) -> None:
    """Idempotent — safe to call on every startup."""
    existing = {name for (name,) in db.query(Category.name).all()}
    for name in DEFAULT_CATEGORIES:
        if name not in existing:
            db.add(Category(name=name))
    db.commit()
