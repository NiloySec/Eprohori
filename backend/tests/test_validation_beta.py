"""Input validation, content limits, and public stats."""


def test_validate_text_rejects_empty(client):
    assert client.post("/api/validate/text", json={"text": "   "}).status_code == 422


def test_validate_text_rejects_overlong(client):
    import main
    big = "x" * (main.MAX_THREAT_CONTENT_LEN + 1)
    assert client.post("/api/validate/text", json={"text": big}).status_code == 413


def test_stats_public_ok(client):
    r = client.get("/api/stats")
    assert r.status_code == 200
    assert "total_threats" in r.json()
