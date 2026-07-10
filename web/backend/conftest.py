"""Pytest fixtures — isolated in-memory SQLite, no external services."""
import os

# Must be set before importing main (it reads JWT_SECRET at import time)
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production-use-only-ci")
os.environ.setdefault("ENV", "development")
os.environ.setdefault("ADMIN_EMAIL", "admin@test.local")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import database
from database import Base


@pytest.fixture()
def client(monkeypatch):
    """Fresh in-memory DB + TestClient per test. Lifespan/seed disabled for speed."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Point the app's DB machinery at the test engine
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)

    import main
    Base.metadata.create_all(bind=engine)

    def _override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = _override_get_db
    main._ip_throttle.clear()  # fresh rate-limit state per test

    # No `with` block → lifespan (seed_db, ML warmup, _bootstrap_admin) is skipped,
    # keeping tests fully isolated and fast.
    c = TestClient(main.app)
    c._test_session_factory = TestingSessionLocal  # type: ignore[attr-defined]
    yield c

    main.app.dependency_overrides.clear()


@pytest.fixture()
def db_session(client):
    """A session bound to the same in-memory DB the client uses."""
    return client._test_session_factory()  # type: ignore[attr-defined]
