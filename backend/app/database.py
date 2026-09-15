from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings


# ---------------------------------------------------------
# Database Engine
# ---------------------------------------------------------

connect_args = (
    {"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()


# ---------------------------------------------------------
# Database Dependency
# ---------------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------
# Lightweight SQLite Migration
# ---------------------------------------------------------

def _ensure_bug_analysis_risk_columns():
    """
    Adds the AI Risk Score columns to an existing SQLite database.

    This allows old project databases to continue working without
    deleting existing users, bugs, analysis history, or other data.

    If the columns already exist, nothing is changed.
    """

    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)

    # On a brand-new database the table may not exist yet.
    # Base.metadata.create_all() will create it later.
    if "bug_analyses" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("bug_analyses")
    }

    migrations = []

    if "risk_score" not in existing_columns:
        migrations.append(
            "ALTER TABLE bug_analyses "
            "ADD COLUMN risk_score INTEGER NOT NULL DEFAULT 0"
        )

    if "risk_level" not in existing_columns:
        migrations.append(
            "ALTER TABLE bug_analyses "
            "ADD COLUMN risk_level VARCHAR(30) NOT NULL DEFAULT 'Minimal'"
        )

    if "risk_summary" not in existing_columns:
        migrations.append(
            "ALTER TABLE bug_analyses "
            "ADD COLUMN risk_summary TEXT"
        )

    if "risk_factors_json" not in existing_columns:
        migrations.append(
            "ALTER TABLE bug_analyses "
            "ADD COLUMN risk_factors_json TEXT"
        )

    if not migrations:
        return

    with engine.begin() as connection:
        for statement in migrations:
            connection.execute(text(statement))

    print("AI Risk Score database migration completed successfully.")


def _ensure_bug_language_tags_columns():
    """
    Adds the `language` and `tags` columns to an existing SQLite `bugs`
    table (ported from the "Add Past Defect" feature). Same pattern as
    _ensure_bug_analysis_risk_columns(): additive, safe to run every
    startup, and a no-op once the columns exist.
    """

    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)

    if "bugs" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("bugs")
    }

    migrations = []

    if "language" not in existing_columns:
        migrations.append("ALTER TABLE bugs ADD COLUMN language VARCHAR(80)")

    if "tags" not in existing_columns:
        migrations.append("ALTER TABLE bugs ADD COLUMN tags VARCHAR(255)")

    if not migrations:
        return

    with engine.begin() as connection:
        for statement in migrations:
            connection.execute(text(statement))

    print("Bug language/tags database migration completed successfully.")


def _ensure_bug_analysis_novel_features_columns():
    """
    Adds code_diff, ai_thinking_steps, tokens_used, ai_model, temp_settings,
    and chat_history columns to existing SQLite bug_analyses table.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "bug_analyses" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("bug_analyses")
    }

    migrations = []
    if "code_diff" not in existing_columns:
        migrations.append("ALTER TABLE bug_analyses ADD COLUMN code_diff TEXT")
    if "ai_thinking_steps" not in existing_columns:
        migrations.append("ALTER TABLE bug_analyses ADD COLUMN ai_thinking_steps TEXT")
    if "tokens_used" not in existing_columns:
        migrations.append("ALTER TABLE bug_analyses ADD COLUMN tokens_used INTEGER DEFAULT 0")
    if "ai_model" not in existing_columns:
        migrations.append("ALTER TABLE bug_analyses ADD COLUMN ai_model VARCHAR(50) DEFAULT 'Nexus-Pro'")
    if "temp_settings" not in existing_columns:
        migrations.append("ALTER TABLE bug_analyses ADD COLUMN temp_settings TEXT DEFAULT '{}'")
    if "chat_history" not in existing_columns:
        migrations.append("ALTER TABLE bug_analyses ADD COLUMN chat_history TEXT DEFAULT '[]'")

    if not migrations:
        return

    with engine.begin() as connection:
        for statement in migrations:
            connection.execute(text(statement))

    print("Novel features database migration completed successfully.")


def _ensure_users_columns():
    """
    Adds organization and status columns to an existing SQLite users table.
    Ensures that existing databases seamlessly support all User model fields.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    migrations = []
    if "organization" not in existing_columns:
        migrations.append("ALTER TABLE users ADD COLUMN organization VARCHAR(120) DEFAULT 'TechCorp Solutions'")
    if "status" not in existing_columns:
        migrations.append("ALTER TABLE users ADD COLUMN status VARCHAR(30) DEFAULT 'Active'")

    if not migrations:
        return

    with engine.begin() as connection:
        for statement in migrations:
            connection.execute(text(statement))

    print("Users table database migration completed successfully.")


# Run migrations automatically when backend starts.
_ensure_users_columns()
_ensure_bug_analysis_risk_columns()
_ensure_bug_language_tags_columns()
_ensure_bug_analysis_novel_features_columns()