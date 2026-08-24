"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-23

Creates every table owned by the app's SQLAlchemy models, plus the seeded
category taxonomy (previously done via Base.metadata.create_all() +
seed_categories() at import time — now managed here so multi-worker starts
and fresh deploys are race-free and reproducible).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Mirrors app.categories.seed.DEFAULT_CATEGORIES — kept in sync manually.
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


def _timestamp_default() -> sa.text:
    # CURRENT_TIMESTAMP is valid on both PostgreSQL and SQLite (used by tests),
    # unlike now().
    return sa.text("CURRENT_TIMESTAMP")


def _timestamp_column(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), server_default=_timestamp_default())


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("display_name", sa.String(), nullable=True),
        _timestamp_column("created_at"),
        _timestamp_column("updated_at"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"])
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_categories_id"), "categories", ["id"])
    op.create_index(op.f("ix_categories_name"), "categories", ["name"], unique=True)

    categories_table = sa.table("categories", sa.column("name", sa.String))
    for name in DEFAULT_CATEGORIES:
        op.execute(categories_table.insert().values(name=name))

    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("institution", sa.String(length=100), nullable=True),
        sa.Column("last_four_digits", sa.String(length=4), nullable=True),
        _timestamp_column("created_at"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_accounts_id"), "accounts", ["id"])
    op.create_index(op.f("ix_accounts_user_id"), "accounts", ["user_id"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("txn_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("dedupe_hash", sa.String(), nullable=False),
        _timestamp_column("created_at"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "dedupe_hash", name="uq_user_dedupe_hash"),
    )
    op.create_index(op.f("ix_transactions_id"), "transactions", ["id"])
    op.create_index(op.f("ix_transactions_user_id"), "transactions", ["user_id"])
    op.create_index(op.f("ix_transactions_account_id"), "transactions", ["account_id"])
    op.create_index(op.f("ix_transactions_category_id"), "transactions", ["category_id"])
    op.create_index(op.f("ix_transactions_dedupe_hash"), "transactions", ["dedupe_hash"])

    op.create_table(
        "budgets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("target_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_budgets_id"), "budgets", ["id"])
    op.create_index(op.f("ix_budgets_user_id"), "budgets", ["user_id"])
    op.create_index(op.f("ix_budgets_category_id"), "budgets", ["category_id"])

    op.create_table(
        "analysis_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("period_label", sa.String(), nullable=False),
        sa.Column("health_score", sa.Integer(), nullable=False),
        sa.Column("savings_rate", sa.Numeric(6, 2), nullable=False),
        sa.Column("total_income", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_expenses", sa.Numeric(12, 2), nullable=False),
        _timestamp_column("created_at"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_analysis_snapshots_id"), "analysis_snapshots", ["id"])
    op.create_index(op.f("ix_analysis_snapshots_user_id"), "analysis_snapshots", ["user_id"])

    op.create_table(
        "bills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("reminder_days_before", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        _timestamp_column("created_at"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bills_id"), "bills", ["id"])
    op.create_index(op.f("ix_bills_user_id"), "bills", ["user_id"])
    op.create_index(op.f("ix_bills_due_date"), "bills", ["due_date"])


def downgrade() -> None:
    op.drop_index(op.f("ix_bills_due_date"), table_name="bills")
    op.drop_index(op.f("ix_bills_user_id"), table_name="bills")
    op.drop_index(op.f("ix_bills_id"), table_name="bills")
    op.drop_table("bills")

    op.drop_index(op.f("ix_analysis_snapshots_user_id"), table_name="analysis_snapshots")
    op.drop_index(op.f("ix_analysis_snapshots_id"), table_name="analysis_snapshots")
    op.drop_table("analysis_snapshots")

    op.drop_index(op.f("ix_budgets_category_id"), table_name="budgets")
    op.drop_index(op.f("ix_budgets_user_id"), table_name="budgets")
    op.drop_index(op.f("ix_budgets_id"), table_name="budgets")
    op.drop_table("budgets")

    op.drop_index(op.f("ix_transactions_dedupe_hash"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_category_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_account_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_user_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_id"), table_name="transactions")
    op.drop_table("transactions")

    op.drop_index(op.f("ix_accounts_user_id"), table_name="accounts")
    op.drop_index(op.f("ix_accounts_id"), table_name="accounts")
    op.drop_table("accounts")

    op.drop_index(op.f("ix_categories_name"), table_name="categories")
    op.drop_index(op.f("ix_categories_id"), table_name="categories")
    op.drop_table("categories")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
