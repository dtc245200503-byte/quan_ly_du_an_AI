import datetime as dt
import json
from unittest.mock import patch
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from backend.auth import hash_password, verify_password
from backend.config import settings
from backend.models import AuthChallenge, User

EMAIL = "user@example.com"
PHONE = "0912345678"
PASSWORD = "Password123!"


def signup(client, identifier=EMAIL, email=None, **extra):
    body = {"identifier": identifier, "full_name": "Test User", "password": PASSWORD, "role": "Member", **extra}
    if email is not None:
        body["email"] = email
    return client.post("/api/auth/register", json=body)


def verify(client, mailbox, purpose="register", email=EMAIL, code=None):
    route = "register/verify" if purpose == "register" else "reset-password/verify"
    return client.post("/api/auth/" + route, json={"identifier": email, "token_or_otp": code or mailbox[-1]["code"]})


def login(client, identifier=EMAIL, password=PASSWORD):
    return client.post("/api/auth/login", json={"identifier": identifier, "password": password})


def registered(client, mailbox, phone=False):
    response = signup(client, PHONE if phone else EMAIL, EMAIL if phone else None)
    assert response.status_code == 200
    assert verify(client, mailbox).status_code == 200


def legacy(db, email=EMAIL, phone=None):
    user = User(email=email, phone_number=phone, full_name="Legacy User", role="PM", password_hash=hash_password(PASSWORD))
    db.add(user)
    db.commit()
    return user


def expire(db, key):
    row = db.get(AuthChallenge, key)
    row.expires_at = dt.datetime.utcnow() - dt.timedelta(seconds=1)
    db.commit()
    return row


@pytest.mark.parametrize("phone", [False, True])
def test_registration_otp_then_email_and_phone_login(client, db_session, mailbox, phone):
    response = signup(client, " (091) 234-5678 " if phone else " USER@EXAMPLE.COM ", " USER@EXAMPLE.COM " if phone else None)
    assert response.status_code == 200
    assert "access_token" not in response.json() and "user" not in response.json()
    assert response.json()["registration_email"] == EMAIL
    assert db_session.query(User).count() == 0
    assert mailbox[-1]["email"] == EMAIL and mailbox[-1]["purpose"] == "register"
    row = db_session.get(AuthChallenge, "register:" + EMAIL)
    data = json.loads(row.payload)
    assert data["phone_number"] == (PHONE if phone else None)
    assert PASSWORD not in row.payload
    assert row.code_hash != mailbox[-1]["code"]
    assert login(client, PHONE if phone else EMAIL).status_code == 401
    assert login(client, password=mailbox[-1]["code"]).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + mailbox[-1]["code"]}).status_code == 401
    assert verify(client, mailbox).status_code == 200
    user = db_session.query(User).one()
    assert user.email == EMAIL and user.phone_number == (PHONE if phone else None)
    assert verify_password(PASSWORD, user.password_hash)
    assert verify(client, mailbox).status_code == 400
    assert login(client, "USER@EXAMPLE.COM").status_code == 200
    if phone:
        assert login(client, "(091) 234-5678").status_code == 200


@pytest.mark.parametrize("identifier,email", [("invalid", None), ("x@", None), ("x@invalid", None),
    (PHONE, None), (PHONE, "invalid"), ("123", EMAIL), ("12+3456789", EMAIL),
    ("0912letters", EMAIL), ("1" * 16, EMAIL), (EMAIL, "different@example.com")])
def test_invalid_registration(client, mailbox, identifier, email):
    response = signup(client, identifier, email)
    assert response.status_code == 422 and PASSWORD not in response.text
    assert not mailbox


@pytest.mark.parametrize("password", ["1234567", "x" * 73, "long-unicode-" + chr(0x1f600) * 20])
def test_password_policy_preserved(client, mailbox, password):
    response = signup(client, password=password)
    assert response.status_code == 422
    assert not mailbox


def test_public_admin_role_rejected(client, mailbox):
    assert signup(client, role="Admin").status_code == 422
    assert not mailbox


@pytest.mark.parametrize("role", ["Member", "PM"])
def test_permitted_roles(client, db_session, mailbox, role):
    assert signup(client, role=role).status_code == 200
    assert verify(client, mailbox).status_code == 200
    assert db_session.query(User).one().role == role


@pytest.mark.parametrize("phone", [False, True])
def test_duplicate_email(client, db_session, mailbox, phone):
    legacy(db_session, email="USER@example.com")
    assert signup(client, PHONE if phone else EMAIL, EMAIL if phone else None).status_code == 400
    assert not mailbox and db_session.query(User).count() == 1


@pytest.mark.parametrize("stored_phone", [PHONE, "(091) 234-5678"])
def test_duplicate_phone(client, db_session, mailbox, stored_phone):
    legacy(db_session, email="other@example.com", phone=stored_phone)
    assert signup(client, PHONE, EMAIL).status_code == 400
    assert not mailbox and db_session.query(User).count() == 1


@pytest.mark.parametrize("conflict", ["email", "phone"])
def test_duplicates_rechecked_at_verification(client, db_session, mailbox, conflict):
    assert signup(client, PHONE, EMAIL).status_code == 200
    legacy(db_session, email=EMAIL if conflict == "email" else "other@example.com", phone=PHONE if conflict == "phone" else None)
    assert verify(client, mailbox).status_code == 400
    assert db_session.query(User).count() == 1


def test_integrity_conflict_is_safe(client, db_session, mailbox):
    signup(client, PHONE, EMAIL)
    with patch.object(db_session, "commit", side_effect=IntegrityError("hidden", {}, Exception("private"))):
        response = verify(client, mailbox)
    assert response.status_code == 400 and "private" not in response.text
    assert db_session.query(User).count() == 0


def test_wrong_code_and_attempt_limit(client, db_session, mailbox):
    signup(client)
    wrong = "000000" if mailbox[-1]["code"] != "000000" else "111111"
    for _ in range(settings.OTP_MAX_ATTEMPTS):
        assert verify(client, mailbox, code=wrong).status_code == 400
    assert verify(client, mailbox).status_code == 400
    row = db_session.get(AuthChallenge, "register:" + EMAIL)
    assert row.code_hash is None and row.payload is None
    assert db_session.query(User).count() == 0


@pytest.mark.parametrize("phone", [False, True])
def test_expired_registration(client, db_session, mailbox, phone):
    signup(client, PHONE if phone else EMAIL, EMAIL if phone else None)
    expire(db_session, "register:" + EMAIL)
    assert verify(client, mailbox).status_code == 400
    assert db_session.query(User).count() == 0


def test_phone_resend_uses_email_and_preserves_payload(client, db_session, mailbox, monkeypatch):
    signup(client, PHONE, EMAIL)
    assert client.post("/api/auth/register/resend", json={"identifier": PHONE}).status_code == 422
    assert client.post("/api/auth/register/verify", json={"identifier": PHONE, "token_or_otp": mailbox[-1]["code"]}).status_code == 422
    assert client.post("/api/auth/register/resend", json={"identifier": EMAIL}).status_code == 429
    original = mailbox[-1]["code"]
    monkeypatch.setattr(settings, "OTP_RESEND_SECONDS", 0)
    wrong = "000000" if original != "000000" else "111111"
    assert verify(client, mailbox, code=wrong).status_code == 400
    assert client.post("/api/auth/register/resend", json={"identifier": " USER@EXAMPLE.COM "}).status_code == 200
    assert mailbox[-1]["email"] == EMAIL
    row = db_session.get(AuthChallenge, "register:" + EMAIL)
    assert json.loads(row.payload)["phone_number"] == PHONE and row.attempts == 1
    if original != mailbox[-1]["code"]:
        assert verify(client, mailbox, code=original).status_code == 400
    assert verify(client, mailbox).status_code == 200
    assert db_session.query(User).one().phone_number == PHONE


def test_resend_cannot_change_phone_or_restart_consumed_signup(client, db_session, mailbox, monkeypatch):
    signup(client, PHONE, EMAIL)
    monkeypatch.setattr(settings, "OTP_RESEND_SECONDS", 0)
    assert client.post("/api/auth/register/resend", json={"identifier": EMAIL, "phone_number": "0999999999"}).status_code == 200
    assert verify(client, mailbox).status_code == 200
    assert db_session.query(User).one().phone_number == PHONE
    assert client.post("/api/auth/register/resend", json={"identifier": EMAIL}).status_code == 400


def test_send_and_ip_limits(client, mailbox, monkeypatch):
    monkeypatch.setattr(settings, "OTP_RESEND_SECONDS", 0)
    for _ in range(settings.OTP_MAX_SENDS):
        assert signup(client).status_code == 200
    assert signup(client).status_code == 429
    monkeypatch.setattr(settings, "OTP_IP_MAX_SENDS", settings.OTP_MAX_SENDS)
    assert signup(client, "another@example.com").status_code == 429


def test_missing_or_failed_smtp_never_reports_success(client, db_session, mailbox, monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    assert signup(client).status_code == 503 and not mailbox
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test.invalid")
    with patch("backend.services.auth_challenges.send_otp", side_effect=HTTPException(503, "Delivery failed")):
        assert signup(client).status_code == 503
    assert db_session.query(AuthChallenge).count() == db_session.query(User).count() == 0


def test_reset_requires_verified_token_and_confirmation(client, db_session, mailbox):
    registered(client, mailbox, phone=True)
    assert client.post("/api/auth/forgot-password", json={"identifier": EMAIL}).status_code == 200
    body = {"identifier": EMAIL, "token_or_otp": mailbox[-1]["code"], "new_password": "NewPassword123!", "confirm_password": "NewPassword123!"}
    assert client.post("/api/auth/reset-password", json=body).status_code == 422
    token_response = verify(client, mailbox, "reset")
    assert token_response.status_code == 200
    token = token_response.json()["reset_token"]
    row = db_session.get(AuthChallenge, "reset:" + EMAIL)
    assert row.code_hash is None and row.grant_hash != token
    assert verify(client, mailbox, "reset").status_code == 400
    body["token_or_otp"] = token
    body["confirm_password"] = "Mismatch123!"
    assert client.post("/api/auth/reset-password", json=body).status_code == 400
    body["confirm_password"] = body["new_password"]
    response = client.post("/api/auth/reset-password", json=body)
    assert response.status_code == 200 and "access_token" not in response.json()
    assert client.post("/api/auth/reset-password", json=body).status_code == 400
    assert login(client).status_code == 401
    assert login(client, PHONE, body["new_password"]).status_code == 200
    assert verify_password(body["new_password"], db_session.query(User).one().password_hash)


@pytest.mark.parametrize("expired", [False, True])
def test_reset_wrong_or_expired_otp(client, db_session, mailbox, expired):
    registered(client, mailbox)
    client.post("/api/auth/forgot-password", json={"identifier": EMAIL})
    if expired:
        expire(db_session, "reset:" + EMAIL)
    wrong = "000000" if mailbox[-1]["code"] != "000000" else "111111"
    assert verify(client, mailbox, "reset", code=mailbox[-1]["code"] if expired else wrong).status_code == 400
    assert login(client).status_code == 200


@pytest.mark.parametrize("expired", [False, True])
def test_reset_invalid_or_expired_token(client, db_session, mailbox, expired):
    registered(client, mailbox)
    client.post("/api/auth/forgot-password", json={"identifier": EMAIL})
    token = verify(client, mailbox, "reset").json()["reset_token"]
    if expired:
        expire(db_session, "reset:" + EMAIL)
    body = {"identifier": EMAIL, "token_or_otp": token if expired else "invalid-token-" * 3,
            "new_password": "NewPassword123!", "confirm_password": "NewPassword123!"}
    assert client.post("/api/auth/reset-password", json=body).status_code == 400
    assert login(client).status_code == 200


def test_reset_attempt_limit_and_resend_invalidates_grant(client, db_session, mailbox, monkeypatch):
    registered(client, mailbox)
    client.post("/api/auth/forgot-password", json={"identifier": EMAIL})
    token = verify(client, mailbox, "reset").json()["reset_token"]
    assert client.post("/api/auth/forgot-password", json={"identifier": EMAIL}).status_code == 429
    monkeypatch.setattr(settings, "OTP_RESEND_SECONDS", 0)
    assert client.post("/api/auth/forgot-password", json={"identifier": EMAIL}).status_code == 200
    body = {"identifier": EMAIL, "token_or_otp": token, "new_password": "NewPassword123!", "confirm_password": "NewPassword123!"}
    assert client.post("/api/auth/reset-password", json=body).status_code == 400
    wrong = "000000" if mailbox[-1]["code"] != "000000" else "111111"
    for _ in range(settings.OTP_MAX_ATTEMPTS - 1):
        assert verify(client, mailbox, "reset", code=wrong).status_code == 400
    assert verify(client, mailbox, "reset").status_code == 400
    assert client.post("/api/auth/forgot-password", json={"identifier": EMAIL}).status_code == 429


def test_reset_responses_do_not_disclose_account_existence(client, mailbox):
    registered(client, mailbox)
    known = client.post("/api/auth/forgot-password", json={"identifier": EMAIL})
    unknown = client.post("/api/auth/forgot-password", json={"identifier": "unknown@example.com"})
    assert known.status_code == unknown.status_code == 200 and known.json() == unknown.json()
    assert verify(client, mailbox, "reset", email="unknown@example.com").status_code == 400


def test_registration_code_cannot_reset_password(client, mailbox):
    signup(client)
    assert verify(client, mailbox, "reset").status_code == 400


@pytest.mark.parametrize("phone", [PHONE, "(091) 234-5678", "12345"])
def test_existing_phone_accounts_and_lockout(client, db_session, phone):
    user = legacy(db_session, phone=phone)
    assert login(client, phone).status_code == 200
    if phone != "12345":
        assert login(client, "091 234 5678").status_code == 200
    for _ in range(4):
        assert login(client, phone, "wrong").status_code == 401
    assert login(client, phone, "wrong").status_code == 403
    assert login(client, phone).status_code == 403
    db_session.refresh(user)
    assert user.failed_login_attempts == 5 and user.locked_until is not None


def test_shared_fixture_verifies_registration_before_login(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "testuser@g9.vn" and response.json()["role"] == "PM"
