"""
conftest.py — Shared pytest fixtures for INHO backend tests.

SQLite Compatibility:
    PostgreSQL uses `schema="public"` on the User table, which SQLite doesn't support.
    This conftest patches SQLAlchemy's Table to strip schemas when using SQLite.
"""
import os
import pytest
import pytest_asyncio
from sqlalchemy import event
from sqlalchemy.engine import Engine

# ── Force SQLite for tests ────────────────────────────────────────
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_inho.db")


# ── SQLite: strip schema prefix (incompatible with PostgreSQL schemas) ──
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Enable foreign keys in SQLite."""
    try:
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    except Exception:
        pass


def pytest_configure(config):
    """
    Strip schema='public' from all SQLAlchemy tables when running under
    aiosqlite, because SQLite does not support schemas.
    """
    import sqlalchemy
    _orig_table_init = sqlalchemy.Table.__init__

    def _patched_table_init(self, *args, **kwargs):
        # Remove schema from kwargs if we're in SQLite mode
        db_url = os.environ.get("DATABASE_URL", "")
        if "sqlite" in db_url:
            kwargs.pop("schema", None)
        _orig_table_init(self, *args, **kwargs)

    # Also patch the models metadata at import time by removing schema from
    # existing table definitions via a metadata event
    pass  # Tables are already imported; use the event below instead


def _strip_public_schema_from_metadata():
    """
    Directly patch models that have schema='public' after import.
    Called once during conftest initialization.
    """
    db_url = os.environ.get("DATABASE_URL", "")
    if "sqlite" not in db_url:
        return

    try:
        from models.models import User
        # The User table has __table_args__ = {"schema": "public"}
        # We need to remove it from the table after class creation
        if hasattr(User, "__table__") and User.__table__.schema == "public":
            User.__table__.schema = None
            # Rebuild the fullname used in FK references
            # Also fix any ForeignKey columns that reference public.users.id
            from sqlalchemy import MetaData
            # Reset the table key in metadata
            meta = User.__table__.metadata
            old_key = "public.users"
            new_key = "users"
            if old_key in meta.tables:
                tbl = meta.tables.pop(old_key)
                tbl.schema = None
                meta.tables[new_key] = tbl
    except Exception as e:
        print(f"[conftest] Warning: could not patch User schema: {e}")


# Run the patch at import time
_strip_public_schema_from_metadata()
