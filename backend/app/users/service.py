from sqlalchemy.orm import Session

from .models import User


def get_or_create_user(
    db: Session,
    user_id: str,
    email: str | None = None,
    display_name: str | None = None,
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id, email=email, display_name=display_name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
