def test_register_and_login_email(client):
    # Register
    res = client.post("/api/auth/register", json={
        "identifier": "user1@g9.vn",
        "password": "Password123!",
        "full_name": "User One"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "user1@g9.vn"

    # Login
    login_res = client.post("/api/auth/login", json={
        "identifier": "user1@g9.vn",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_register_and_login_phone(client):
    # Register by Phone
    res = client.post("/api/auth/register", json={
        "identifier": "0912345678",
        "password": "Password123!",
        "full_name": "User Phone"
    })
    assert res.status_code == 200
    assert res.json()["user"]["phone_number"] == "0912345678"

    # Login by Phone
    login_res = client.post("/api/auth/login", json={
        "identifier": "0912345678",
        "password": "Password123!"
    })
    assert login_res.status_code == 200

def test_forgot_and_reset_password(client):
    client.post("/api/auth/register", json={
        "identifier": "reset@g9.vn",
        "password": "OldPassword123",
        "full_name": "Reset User"
    })

    forgot_res = client.post("/api/auth/forgot-password", json={"identifier": "reset@g9.vn"})
    assert forgot_res.status_code == 200

    reset_res = client.post("/api/auth/reset-password", json={
        "identifier": "reset@g9.vn",
        "token_or_otp": "889966",
        "new_password": "NewPassword123!"
    })
    assert reset_res.status_code == 200

    # Try login with new password
    login_res = client.post("/api/auth/login", json={
        "identifier": "reset@g9.vn",
        "password": "NewPassword123!"
    })
    assert login_res.status_code == 200
