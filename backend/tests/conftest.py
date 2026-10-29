import os
import tempfile

# Must precede imports: main.py creates tables and patches schema at import time.
# Neither application initialization nor request fixtures may open a local DB.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "isolated-auth-tests-only-not-a-production-key"
os.environ["GEMINI_API_KEY"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["SMTP_HOST"] = "smtp.test.invalid"
os.environ["SMTP_USERNAME"] = ""
os.environ["SMTP_PASSWORD"] = ""
os.environ["SMTP_FROM_EMAIL"] = "test@example.com"
_test_uploads = tempfile.TemporaryDirectory(prefix="g9-auth-test-uploads-")
os.environ["UPLOAD_DIR"] = _test_uploads.name

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.database import Base, get_db
from backend.main import app


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False},
                           poolclass=StaticPool, hide_parameters=True)
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture(autouse=True)
def mailbox(monkeypatch):
    from backend.config import settings
    from backend.services import auth_challenges
    import smtplib
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test.invalid")
    monkeypatch.setattr(settings, "SMTP_FROM_EMAIL", "test@example.com")
    monkeypatch.setattr(settings, "SMTP_USERNAME", "")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(settings, "SMTP_USE_TLS", True)
    monkeypatch.setattr(settings, "SMTP_USE_SSL", False)
    messages = []
    def capture(email, code, purpose):
        messages.append({"email": email, "code": code, "purpose": purpose})
    def block_network(*args, **kwargs):
        raise AssertionError("Real SMTP must not be used by tests")
    monkeypatch.setattr(auth_challenges, "send_otp", capture)
    monkeypatch.setattr(smtplib, "SMTP", block_network)
    monkeypatch.setattr(smtplib, "SMTP_SSL", block_network)
    yield messages
    messages.clear()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.rollback()
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client, mailbox):
    credentials = {"identifier": "testuser@g9.vn", "password": "Password123!"}
    registration = client.post("/api/auth/register", json={**credentials, "full_name": "Test User", "role": "PM"})
    assert registration.status_code == 200
    assert "access_token" not in registration.json()
    verified = client.post("/api/auth/register/verify", json={"identifier": credentials["identifier"], "token_or_otp": mailbox[-1]["code"]})
    assert verified.status_code == 200
    logged_in = client.post("/api/auth/login", json=credentials)
    assert logged_in.status_code == 200
    return {"Authorization": "Bearer " + logged_in.json()["access_token"]}
