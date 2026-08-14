import hashlib


def compute_dedupe_hash(user_id: str, txn_date, amount, description: str, account_id: int | None = None) -> str:
    # account_id is part of the hash so e.g. rent paid from two different
    # accounts on the same day isn't mistaken for a duplicate of itself.
    raw = f"{user_id}|{account_id or 'none'}|{txn_date}|{amount}|{description.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()
