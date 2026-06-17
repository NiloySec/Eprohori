"""Authorization / IDOR — admin endpoints and per-user data isolation."""
import main
from models import User, Threat


def _admin_token(db_session):
    u = User(name="Admin", email="admin@test.local",
             password_hash=main._hash_password("x"), is_admin=True)
    db_session.add(u); db_session.commit()
    return main.create_token("admin@test.local", "admin", 1)


def test_admin_pending_requires_auth(client):
    assert client.get("/api/admin/pending").status_code == 403


def test_admin_pending_rejects_user_token(client):
    user_token = main.create_token("u@test.local", "user", 1)
    r = client.get("/api/admin/pending", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 403


def test_admin_backup_requires_admin(client):
    assert client.get("/api/admin/backup").status_code == 403


def test_admin_backup_allows_admin(client, db_session):
    token = _admin_token(db_session)
    r = client.get("/api/admin/backup", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "users" in r.json()


def test_my_reports_requires_auth(client):
    # IDOR guard: no token → not allowed to read "my" reports
    r = client.get("/api/threats/my-reports")
    assert r.status_code in (401, 403)


def test_my_reports_scoped_to_owner(client, db_session):
    # Two users, each with one report; each only sees their own
    for em in ("a@test.local", "b@test.local"):
        db_session.add(User(name=em, email=em, password_hash=main._hash_password("x")))
    db_session.add(Threat(type="sms", content="a-report", reporter_email="a@test.local", status="pending"))
    db_session.add(Threat(type="sms", content="b-report", reporter_email="b@test.local", status="pending"))
    db_session.commit()

    token_a = main.create_token("a@test.local", "user", 1)
    r = client.get("/api/threats/my-reports", headers={"Authorization": f"Bearer {token_a}"})
    assert r.status_code == 200
    rows = r.json()
    assert all("a-report" in (row.get("detail") or row.get("content") or "") or
               row.get("reporter_email", "a@test.local") == "a@test.local" for row in rows)
    # B's report must not leak to A
    contents = [str(row) for row in rows]
    assert not any("b-report" in c for c in contents)
