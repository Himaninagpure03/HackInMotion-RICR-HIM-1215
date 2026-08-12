import hashlib


def compute_dedupe_hash(user_id: str, txn_date, amount, description: str) -> str:
    raw = f"{user_id}|{txn_date}|{amount}|{description.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()
