"""
Shared pytest fixtures.

Each test gets its own fresh SQLite file (via pytest's `tmp_path`) and a
FastAPI TestClient wired to it through a `get_db` dependency override — so
tests never touch the real `bug_analyzer.db` and never leak state between
each other.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    upload_dir = tmp_path / "uploads"
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))

    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def register(client):
    """Factory fixture: register(email=..., full_name=...) -> (token, user_dict)."""

    def _register(full_name="Test User", email="test@example.com", password="pass1234"):
        resp = client.post(
            "/api/auth/register",
            json={"full_name": full_name, "email": email, "password": password},
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        return body["access_token"], body["user"]

    return _register


@pytest.fixture()
def auth_headers(register):
    token, _ = register()
    return {"Authorization": f"Bearer {token}"}
