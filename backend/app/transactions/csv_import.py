"""
Parses a bank-statement-shaped CSV into Transaction rows.

The importer is intentionally defensive:
  - handles UTF-8 CSV files
  - detects common aliases for date/amount/description
  - tolerates unknown extra columns
  - validates required columns before importing
  - handles malformed rows without aborting the entire import
  - handles inconsistent date formats
  - handles currency symbols and thousands separators
  - skips duplicate transactions
  - rolls back the DB transaction if an unexpected error occurs
"""

import csv
import io
import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from dateutil import parser as date_parser
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..categories.models import Category
from .categorizer import categorize
from .dedupe import compute_dedupe_hash
from .models import Transaction
from ..currency.service import get_exchange_rate

logger = logging.getLogger(__name__)


ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


DATE_KEYS = {
    "date",
    "txn_date",
    "transaction date",
    "transaction_date",
    "value date",
    "value_date",
}

AMOUNT_KEYS = {
    "amount",
    "value",
    "debit",
    "credit",
    "amount (inr)",
    "amount_inr",
    "transaction amount",
    "transaction_amount",
}

DESC_KEYS = {
    "description",
    "narration",
    "merchant",
    "particulars",
    "details",
    "transaction description",
    "transaction_description",
}


@dataclass
class ImportResult:
    imported: int = 0
    skipped_duplicates: int = 0
    errors: list[str] = field(default_factory=list)


def _normalise_header(value: str) -> str:
    """
    Normalise a CSV header so small formatting differences don't matter.

    Examples:
        " Transaction Date " -> "transaction date"
        "TRANSACTION_DATE"  -> "transaction date"
    """
    return re.sub(r"\s+", " ", value.strip().lower().replace("_", " "))


def _find_column(
    fieldnames: list[str],
    candidates: set[str],
) -> str | None:
    """
    Find a CSV column using normalised aliases.
    """
    normalised_candidates = {
        _normalise_header(candidate)
        for candidate in candidates
    }

    for fieldname in fieldnames:
        if _normalise_header(fieldname) in normalised_candidates:
            return fieldname

    return None


def _parse_date(raw: str) -> date | None:
    """
    Parse common bank statement date formats.

    ISO dates are handled explicitly because dateutil with
    dayfirst=True can incorrectly interpret them.
    """
    raw = raw.strip()

    if not raw:
        return None

    if ISO_DATE_RE.match(raw):
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            return None

    try:
        return date_parser.parse(
            raw,
            dayfirst=True,
            fuzzy=False,
        ).date()
    except (ValueError, OverflowError, TypeError):
        return None

def _detect_currency(raw: str) -> str:
    """
    Detect currency from common currency symbols.

    If no symbol is present, INR is used as the default currency.
    """
    if not raw:
        return "INR"

    value = raw.strip()

    if "₹" in value:
        return "INR"
    if "$" in value:
        return "USD"
    if "€" in value:
        return "EUR"
    if "£" in value:
        return "GBP"

    return "INR"
def _parse_amount(raw: str) -> Decimal | None:
    """
    Parse currency/amount values such as:

        1,250.50
        ₹1,250.50
        $1,250.50
        -500
        (500)

    Returns None for invalid values.
    """
    if not raw:
        return None

    cleaned = raw.strip()

    if not cleaned:
        return None

    # Handle accounting-style negative amounts:
    # (500.00) -> -500.00
    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = f"-{cleaned[1:-1]}"

    # Remove common currency symbols and separators.
    cleaned = (
        cleaned
        .replace(",", "")
        .replace("₹", "")
        .replace("$", "")
        .replace("€", "")
        .replace("£", "")
        .strip()
    )

    if not cleaned:
        return None

    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def _validate_headers(
    fieldnames: list[str],
    date_col: str | None,
    amount_col: str | None,
    desc_col: str | None,
) -> list[str]:
    """
    Validate CSV structure.

    Unknown columns are allowed because different banks export
    different statement formats.
    """
    errors: list[str] = []

    if not fieldnames:
        errors.append("CSV does not contain a header row.")
        return errors

    # Empty header names are usually a malformed CSV.
    empty_headers = [
        str(index + 1)
        for index, name in enumerate(fieldnames)
        if not name or not name.strip()
    ]

    if empty_headers:
        errors.append(
            "CSV contains empty column names "
            f"(column positions: {', '.join(empty_headers)})."
        )

    if date_col is None:
        errors.append(
            "Could not find a date column. "
            "Expected something like: Date, Transaction Date, Value Date."
        )

    if amount_col is None:
        errors.append(
            "Could not find an amount column. "
            "Expected something like: Amount, Debit, Credit."
        )

    if desc_col is None:
        errors.append(
            "Could not find a description column. "
            "Expected something like: Description, Narration, Merchant."
        )

    return errors


def import_transactions_csv(
    db: Session,
    user_id: str,
    file_bytes: bytes,
    account_id: int | None = None,
) -> ImportResult:
    result = ImportResult()
    rate_cache: dict[str, Decimal] = {}

    # ---------------------------------------------------------
    # 1. Basic file validation
    # ---------------------------------------------------------

    if not file_bytes:
        result.errors.append("The uploaded CSV file is empty.")
        return result

    try:
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        result.errors.append(
            "Could not decode the file. "
            "Please upload a UTF-8 encoded CSV file."
        )
        return result

    if not text.strip():
        result.errors.append("The uploaded CSV file is empty.")
        return result

    # ---------------------------------------------------------
    # 2. Parse CSV safely
    # ---------------------------------------------------------

    try:
        reader = csv.DictReader(
            io.StringIO(text),
            restkey="__extra_columns__",
        )
    except csv.Error as exc:
        result.errors.append(f"Could not parse CSV: {exc}")
        return result

    if not reader.fieldnames:
        result.errors.append(
            "CSV has no header row or the file is empty."
        )
        return result

    # ---------------------------------------------------------
    # 3. Detect required columns
    # ---------------------------------------------------------

    date_col = _find_column(reader.fieldnames, DATE_KEYS)
    amount_col = _find_column(reader.fieldnames, AMOUNT_KEYS)
    desc_col = _find_column(reader.fieldnames, DESC_KEYS)

    header_errors = _validate_headers(
        reader.fieldnames,
        date_col,
        amount_col,
        desc_col,
    )

    if header_errors:
        result.errors.extend(header_errors)
        return result

    # ---------------------------------------------------------
    # 4. Load existing DB information once
    # ---------------------------------------------------------

    try:
        known_hashes = {
            h
            for (h,) in (
                db.query(Transaction.dedupe_hash)
                .filter(Transaction.user_id == user_id)
                .all()
            )
            if h
        }

        category_ids_by_name = {
            name: cat_id
            for cat_id, name in (
                db.query(Category.id, Category.name).all()
            )
        }
    except SQLAlchemyError:
        db.rollback()
        logger.exception("CSV import: failed to prepare database for user %s", user_id)
        result.errors.append(
            "Could not prepare the database for import. Please try again later."
        )
        return result

    # ---------------------------------------------------------
    # 5. Process rows
    # ---------------------------------------------------------

    try:
        for row_number, row in enumerate(reader, start=2):

            # csv.DictReader can put values that don't have a
            # corresponding header into restkey.
            extra_columns = row.get("__extra_columns__")

            if extra_columns:
                result.errors.append(
                    f"Row {row_number}: contains extra columns, skipped."
                )
                continue

            # Make sure row is actually a dictionary.
            if not isinstance(row, dict):
                result.errors.append(
                    f"Row {row_number}: malformed row, skipped."
                )
                continue

            raw_date = (row.get(date_col) or "").strip()
            raw_amount = (row.get(amount_col) or "").strip()
            raw_desc = (row.get(desc_col) or "").strip()

            # -------------------------------------------------
            # Required fields
            # -------------------------------------------------

            missing_fields = []

            if not raw_date:
                missing_fields.append("date")

            if not raw_amount:
                missing_fields.append("amount")

            if not raw_desc:
                missing_fields.append("description")

            if missing_fields:
                result.errors.append(
                    f"Row {row_number}: missing "
                    f"{', '.join(missing_fields)}, skipped."
                )
                continue

            # -------------------------------------------------
            # Date
            # -------------------------------------------------

            txn_date = _parse_date(raw_date)

            if txn_date is None:
                result.errors.append(
                    f"Row {row_number}: invalid date "
                    f"'{raw_date}', skipped."
                )
                continue

            # -------------------------------------------------
            # Amount
            # -------------------------------------------------

            original_currency = _detect_currency(raw_amount)

            original_amount = _parse_amount(raw_amount)

            if original_amount is None:
                result.errors.append(
                    f"Row {row_number}: invalid amount "
                    f"'{raw_amount}', skipped."
                )
                continue

            # Convert foreign currencies to INR.
            if original_currency == "INR":
                amount = original_amount
            else:
                try:
                    if original_currency not in rate_cache:
                        rate_cache[original_currency] = Decimal(
                            str(get_exchange_rate(original_currency, "INR"))
                        )

                    exchange_rate = rate_cache[original_currency]

                    amount = (
                        original_amount * exchange_rate
                    ).quantize(Decimal("0.01"))

                except Exception:
                    logger.exception(
                        "Currency conversion failed for row %s: %s -> INR",
                        row_number,
                        original_currency,
                    )

                    result.errors.append(
                        f"Row {row_number}: could not convert "
                        f"{original_currency} to INR, skipped."
                    )
                    continue


            # -------------------------------------------------
            # Description
            # -------------------------------------------------

            if len(raw_desc) > 1000:
                result.errors.append(
                    f"Row {row_number}: description is too long, skipped."
                )
                continue

            # -------------------------------------------------
            # Duplicate detection
            # -------------------------------------------------

            dedupe_hash = compute_dedupe_hash(
                user_id,
                txn_date,
                amount,
                raw_desc,
                account_id,
            )

            if dedupe_hash in known_hashes:
                result.skipped_duplicates += 1
                continue

            # Add immediately so duplicates within THIS file
            # are also detected.
            known_hashes.add(dedupe_hash)

            # -------------------------------------------------
            # Categorisation
            # -------------------------------------------------

            try:
                category_name = categorize(raw_desc)
            except Exception:
                # Categorisation should never prevent importing
                # an otherwise valid transaction.
                category_name = None

            category_id = (
                category_ids_by_name.get(category_name)
                if category_name
                else None
            )

            # -------------------------------------------------
            # Create transaction
            # -------------------------------------------------

            db.add(
                Transaction(
                    user_id=user_id,
                    account_id=account_id,
                    category_id=category_id,
                    original_amount=original_amount,
                    original_currency=original_currency,
                    amount=amount,
                    currency="INR",
                    txn_date=txn_date,
                    description=raw_desc,
                    source="csv_import",
                    dedupe_hash=dedupe_hash,)
            )

            result.imported += 1

        # -----------------------------------------------------
        # 6. Commit only after the entire file has been parsed
        # -----------------------------------------------------

        db.commit()

    except csv.Error as exc:
        db.rollback()
        result.errors.append(
            f"CSV parsing failed while processing the file: {exc}"
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception("CSV import: database error for user %s", user_id)
        result.errors.append(
            "Database error while importing transactions. "
            "No transactions were imported."
        )

        # Since the whole transaction was rolled back, the
        # imported count is no longer accurate.
        result.imported = 0

    except Exception:
        # Last-resort protection. The API should not return a
        # 500 simply because one unexpected CSV caused an issue.
        db.rollback()
        logger.exception("CSV import: unexpected error for user %s", user_id)

        result.errors.append(
            "An unexpected error occurred while importing the CSV. "
            "No transactions were imported."
        )

        result.imported = 0

    return result
