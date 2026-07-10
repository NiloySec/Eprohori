"""Rate limiting — the per-IP throttle must return 429 past the limit."""


def test_user_login_throttled_after_limit(client):
    # Login throttle: 10 per 5 min. 11th from same IP → 429.
    codes = [client.post("/api/auth/login",
                         json={"email": "x@test.local", "password": "bad"}).status_code
             for _ in range(11)]
    assert codes[10] == 429


def test_admin_login_throttled(client):
    # 5 attempts / 10 min. 6th → 429 regardless of credentials.
    codes = [client.post("/api/auth/admin-login",
                         json={"email": "x@test.local", "password": "bad"}).status_code
             for _ in range(6)]
    assert codes[5] == 429
