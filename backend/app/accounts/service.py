from sqlalchemy.orm import Session

from ..transactions.models import Transaction
from .models import Account
from .schemas import AccountCreate, AccountUpdate


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
    return db.query(Account).filter(Account.user_id == user_id).all()


def update_account(db: Session, user_id: str, account_id: int, data: AccountUpdate):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        return None

    for field in ("name", "type", "institution", "last_four_digits"):
        value = getattr(data, field)
        if value is not None:
            setattr(account, field, value)

    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, user_id: str, account_id: int) -> bool:
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        return False

    db.query(Transaction).filter(Transaction.account_id == account_id).update(
        {Transaction.account_id: None}
    )
    db.delete(account)
    db.commit()
    return True
