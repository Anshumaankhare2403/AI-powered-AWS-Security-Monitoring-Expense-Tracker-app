import pytest
from app.database.init_db import init_db
from app.database.session import Base, engine


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """
    Ensure all database tables and default category seeds are created
    prior to any test suite execution (handles both MySQL and SQLite fallback).
    """
    init_db()
    yield
