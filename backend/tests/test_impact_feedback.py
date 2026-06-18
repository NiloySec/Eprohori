"""Impact feedback — the pilot's 'did Eprohori save you?' metric."""
from models import ImpactFeedback


def test_feedback_saved_yes_increments(client, db_session):
    r = client.post("/api/feedback/saved", json={"saved": True, "source": "scan"})
    assert r.status_code == 200
    assert r.json()["saved_count"] == 1
    assert db_session.query(ImpactFeedback).filter(ImpactFeedback.saved == True).count() == 1  # noqa: E712


def test_feedback_saved_no_does_not_count(client):
    r = client.post("/api/feedback/saved", json={"saved": False, "source": "alert"})
    assert r.status_code == 200
    # a 'no' is recorded but does not increase the saved_count
    assert r.json()["saved_count"] == 0


def test_stats_exposes_saved_count(client):
    client.post("/api/feedback/saved", json={"saved": True})
    client.post("/api/feedback/saved", json={"saved": True})
    body = client.get("/api/stats").json()
    assert body["saved_count"] == 2
