import pytest
from sqlalchemy import text, inspect
from app.database.session import engine, SessionLocal
from app.models.category import Category


def test_database_connection():
    """Verify that SQLAlchemy connects to MySQL successfully."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
        assert result == 1


def test_database_tables_exist():
    """Verify all 8 core tables exist in the MySQL database."""
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    required_tables = [
        "users",
        "refresh_tokens",
        "categories",
        "transactions",
        "budgets",
        "savings_goals",
        "goal_contributions",
        "notifications",
    ]
    for table in required_tables:
        assert table in table_names, f"Table '{table}' not found in database."


def test_seeded_default_categories():
    """Verify that default categories were seeded properly."""
    db = SessionLocal()
    try:
        categories = db.query(Category).filter(Category.is_default == True).all()
        assert len(categories) >= 16

        expense_cats = [c.name for c in categories if c.type == "expense"]
        income_cats = [c.name for c in categories if c.type == "income"]

        for expected_exp in ["Food", "Shopping", "Transportation", "Entertainment", "Rent"]:
            assert expected_exp in expense_cats

        for expected_inc in ["Salary", "Freelancing", "Business", "Investments"]:
            assert expected_inc in income_cats
    finally:
        db.close()
