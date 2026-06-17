"""Auth: registration, login, JWT, admin gating, 2FA wiring."""
import main
from models import User


def _make_user(db_session, email="u@test.local", password="StrongPass123", admin=False):
    u = User(name="Test", email=email, password_hash=main._hash_password(password), is_admin=admin)
    db_session.add(u)
    db_session.commit()
    return u


def test_password_hash_roundtrip():
    h = main._hash_password("hunter2")
    assert main._verify_password("hunter2", h)
    assert not main._verify_password("wrong", h)
    # salted: same password hashes differently each time
    assert main._hash_password("hunter2") != h


def test_login_success(client, db_session):
    _make_user(db_session, "alice@test.local", "MyPassw0rd!")
    r = client.post("/api/auth/login", json={"email": "alice@test.local", "password": "MyPassw0rd!"})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_wrong_password(client, db_session):
    _make_user(db_session, "bob@test.local", "RightPass1")
    r = client.post("/api/auth/login", json={"email": "bob@test.local", "password": "WrongPass1"})
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post("/api/auth/login", json={"email": "ghost@test.local", "password": "x"})
    assert r.status_code == 401


def test_admin_login_requires_admin_flag(client, db_session):
    _make_user(db_session, "plain@test.local", "Pass12345", admin=False)
    r = client.post("/api/auth/admin-login", json={"email": "plain@test.local", "password": "Pass12345"})
    assert r.status_code == 403  # valid creds but not admin


def test_admin_login_success(client, db_session):
    _make_user(db_session, "admin@test.local", "AdminPass9", admin=True)
    r = client.post("/api/auth/admin-login", json={"email": "admin@test.local", "password": "AdminPass9"})
    assert r.status_code == 200
    body = r.json()
    assert body["token"]
    # token must carry admin role
    payload = main.jwt.decode(body["token"], main.JWT_SECRET, algorithms=[main.JWT_ALG])
    assert payload["role"] == "admin"


def test_token_role_enforced_on_require_admin():
    user_token = main.create_token("u@test.local", "user", 1)
    admin_token = main.create_token("a@test.local", "admin", 1)
    creds_user = main.HTTPAuthorizationCredentials(scheme="Bearer", credentials=user_token)
    creds_admin = main.HTTPAuthorizationCredentials(scheme="Bearer", credentials=admin_token)
    import pytest
    with pytest.raises(main.HTTPException) as exc:
        main.require_admin(creds_user)
    assert exc.value.status_code == 403
    assert main.require_admin(creds_admin)["role"] == "admin"
