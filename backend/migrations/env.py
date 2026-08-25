"""Alembic environment — wires migrations to the app's metadata and DATABASE_URL."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

# Import every model module so Base.metadata is fully populated before
# autogenerate compares it against the live database.
from app.accounts import models as account_models  # noqa: F401
from app.analytics import models as analytics_models  # noqa: F401
from app.bills import models as bill_models  # noqa: F401
from app.budgets import models as budget_models  # noqa: F401
from app.categories import models as category_models  # noqa: F401
from app.core.config import settings
from app.core.database import Base
from app.transactions import models as transaction_models  # noqa: F401
from app.users import models as user_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without a DB connection (alembic upgrade --sql)."""
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    connectable = create_engine(settings.database_url, pool_pre_ping=True)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
