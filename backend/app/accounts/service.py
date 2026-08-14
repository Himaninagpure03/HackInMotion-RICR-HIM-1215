from sqlalchemy.orm import Session
from .models import Account
from .schemas import AccountCreate
def create_account(
    db: Session,
    account_data: AccountCreate,
    user_id: str,
):
    account = Account(
        user_id=user_id,
        name=account_data.name,
        type=account_data.type,
        institution=account_data.institution,
        last_four_digits=account_data.last_four_digits,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account
def get_user_accounts(db: Session, user_id: str):
    return (
        db.query(Account)
        .filter(Account.user_id == user_id)
        .all()
    )
