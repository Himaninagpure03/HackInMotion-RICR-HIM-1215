"""
Parses a bank-statement-shaped CSV into Transaction rows.

Handles the messiness called out in the problem statement:
  - unknown/varying column names (tries common aliases per field)
  - inconsistent date formats (dateutil, dayfirst=True as a sane default
    for INR-style statements — flip if your test data is US-formatted)
  - currency symbols / thousands separators in amount fields
  - missing fields (row is skipped, reported in `errors`, import continues)
  - duplicate rows, including duplicates against transactions already in
    the DB from a previous import or manual entry (same dedupe_hash logic
    as manual entry, so re-uploading the same statement is a safe no-op)
"""

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from dateutil import parser as date_parser
from sqlalchemy.orm import Session

from ..categories.models import Category
from .categorizer import categorize
from .dedupe import compute_dedupe_hash
from .models import Transaction

ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

DATE_KEYS = {"date", "txn_date", "transaction date", "value date"}
AMOUNT_KEYS = {"amount", "value", "debit", "credit", "amount (inr)"}
DESC_KEYS = {"description", "narration", "merchant", "particulars", "details"}


@dataclass
class ImportResult:
    imported: int = 0
    skipped_duplicates: int = 0
    errors: list[str] = field(default_factory=list)


def _find_column(fieldnames: list[str], candidates: set[str]) -> str | None:
    lower_map = {name.lower().strip(): name for name in fieldnames}
    for candidate in candidates:
        if candidate in lower_map:
            return lower_map[candidate]
    return None


def _parse_date(raw: str) -> date | None:
    # dateutil's dayfirst=True incorrectly swaps month/day even on
    # unambiguous ISO YYYY-MM-DD input (e.g. "2026-08-11" -> Nov 8
    # instead of Aug 11). Parse ISO dates strictly first; only hand
    # ambiguous DD/MM/YYYY-style strings to the flexible parser.
    if ISO_DATE_RE.match(raw):
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            return None
    try:
        return date_parser.parse(raw, dayfirst=True).date()
    except (ValueError, OverflowError):
        return None


def _parse_amount(raw: str) -> Decimal | None:
    if not raw:
        return None
    cleaned = raw.replace(",", "").replace("₹", "").replace("$", "").strip()
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def import_transactions_csv(db: Session, user_id: str, file_bytes: bytes) -> ImportResult:
    result = ImportResult()

    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        result.errors.append("Could not decode file — please export as UTF-8 CSV.")
        return result

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        result.errors.append("CSV has no header row, or the file is empty.")
        return result

    date_col = _find_column(reader.fieldnames, DATE_KEYS)
    amount_col = _find_column(reader.fieldnames, AMOUNT_KEYS)
    desc_col = _find_column(reader.fieldnames, DESC_KEYS)

    if not (date_col and amount_col and desc_col):
        result.errors.append(
            f"Could not detect date/amount/description columns. Found headers: {reader.fieldnames}"
        )
        return result

    # Preload once rather than querying per row: existing hashes (so a
    # re-uploaded statement is skipped) and the category name -> id map
    # (used by the categorizer output).
    known_hashes = {
        h for (h,) in db.query(Transaction.dedupe_hash).filter(Transaction.user_id == user_id).all()
    }
    category_ids_by_name = {name: cat_id for cat_id, name in db.query(Category.id, Category.name).all()}

    for i, row in enumerate(reader, start=2):  # row 1 is the header
        raw_date = (row.get(date_col) or "").strip()
        raw_amount = (row.get(amount_col) or "").strip()
        raw_desc = (row.get(desc_col) or "").strip()

        if not (raw_date and raw_amount and raw_desc):
            result.errors.append(f"Row {i}: missing a required field, skipped.")
            continue

        txn_date = _parse_date(raw_date)
        if txn_date is None:
            result.errors.append(f"Row {i}: unrecognized date '{raw_date}', skipped.")
            continue

        amount = _parse_amount(raw_amount)
        if amount is None:
            result.errors.append(f"Row {i}: unrecognized amount '{raw_amount}', skipped.")
            continue

        dedupe_hash = compute_dedupe_hash(user_id, txn_date, amount, raw_desc)

        # Checked against known_hashes (updated as we go), not the DB directly —
        # otherwise two duplicate rows within the SAME file wouldn't catch each
        # other, since nothing is committed until the whole batch finishes.
        if dedupe_hash in known_hashes:
            result.skipped_duplicates += 1
            continue
        known_hashes.add(dedupe_hash)

        category_name = categorize(raw_desc)
        category_id = category_ids_by_name.get(category_name) if category_name else None

        db.add(
            Transaction(
                user_id=user_id,
                category_id=category_id,
                amount=amount,
                txn_date=txn_date,
                description=raw_desc,
                source="csv_import",
                dedupe_hash=dedupe_hash,
            )
        )
        result.imported += 1

    db.commit()
    return result
