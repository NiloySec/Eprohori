"""Input validation, content limits, and beta-signup persistence."""
from models import BetaSignup


def test_beta_signup_persists(client, db_session):
    r = client.post("/api/beta-signup", json={"email": "Fan@Example.com"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] and body["already_subscribed"] is False
    # stored lowercased
    assert db_session.query(BetaSignup).filter(BetaSignup.email == "fan@example.com").count() == 1


def test_beta_signup_dedup(client):
    client.post("/api/beta-signup", json={"email": "dup@example.com"})
    r2 = client.post("/api/beta-signup", json={"email": "dup@example.com"})
    assert r2.json()["already_subscribed"] is True
    assert r2.json()["total_signups"] == 1


def test_beta_signup_rejects_bad_email(client):
    for bad in ["", "notanemail", "no@domain", "@x.com"]:
        assert client.post("/api/beta-signup", json={"email": bad}).status_code == 400


def test_beta_signup_rejects_overlong_email(client):
    long_email = "a" * 250 + "@x.com"
    assert client.post("/api/beta-signup", json={"email": long_email}).status_code == 400


def test_validate_text_rejects_empty(client):
    assert client.post("/api/validate/text", json={"text": "   "}).status_code == 422


def test_validate_text_rejects_overlong(client):
    big = "x" * (main_max() + 1)
    assert client.post("/api/validate/text", json={"text": big}).status_code == 413


def main_max():
    import main
    return main.MAX_THREAT_CONTENT_LEN


def test_stats_public_ok(client):
    r = client.get("/api/stats")
    assert r.status_code == 200
    assert "total_threats" in r.json()
