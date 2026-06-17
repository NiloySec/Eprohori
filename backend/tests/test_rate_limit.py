"""Rate limiting — the per-IP throttle must return 429 past the limit."""


def test_beta_signup_throttled_after_limit(client):
    # Limit is 5 per 5 min. 6th distinct request from same IP → 429.
    codes = [client.post("/api/beta-signup", json={"email": f"u{i}@example.com"}).status_code
             for i in range(6)]
    assert codes[:5] == [200, 200, 200, 200, 200]
    assert codes[5] == 429


def test_admin_login_throttled(client):
    # 5 attempts / 10 min. 6th → 429 regardless of credentials.
    codes = [client.post("/api/auth/admin-login",
                         json={"email": "x@test.local", "password": "bad"}).status_code
             for _ in range(6)]
    assert codes[5] == 429
