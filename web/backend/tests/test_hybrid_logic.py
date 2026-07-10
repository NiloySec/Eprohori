"""Hybrid AI reconciliation — ML threat vs AI disagreement must stay consistent."""
import claude_analyzer
from claude_analyzer import AIAnalysis, hybrid_predict


def _safe_ai():
    return ("groq", AIAnalysis(
        is_threat=False, confidence=0.9, category="safe",
        explanation_bn="এটি একটি নিরাপদ বার্তা।", reasons_bn=[],
    ))


def _threat_ai():
    return ("groq", AIAnalysis(
        is_threat=True, confidence=0.95, category="phishing",
        explanation_bn="এটি একটি ফিশিং বার্তা।", reasons_bn=["সন্দেহজনক লিংক"],
    ))


def test_moderate_ml_threat_overridden_by_confident_safe_ai(monkeypatch):
    monkeypatch.setattr(claude_analyzer, "analyze", lambda *a, **k: _safe_ai())
    ml = {"is_threat": True, "confidence": 0.68, "category": "phishing", "reasons": ["x"]}
    out = hybrid_predict("আগামীকাল ৯টায় ক্লাস", ml)
    assert out["is_threat"] is False          # no longer a contradictory threat
    assert out["category"] == "safe"
    assert out["confidence"] <= 0.30


def test_strong_ml_threat_stands_even_if_ai_disagrees(monkeypatch):
    monkeypatch.setattr(claude_analyzer, "analyze", lambda *a, **k: _safe_ai())
    ml = {"is_threat": True, "confidence": 0.97, "category": "phishing", "reasons": ["x"]}
    out = hybrid_predict("টাকা জিতেছেন OTP দিন", ml)
    assert out["is_threat"] is True           # strong ML threat is authoritative


def test_threat_with_agreeing_ai_keeps_threat(monkeypatch):
    monkeypatch.setattr(claude_analyzer, "analyze", lambda *a, **k: _threat_ai())
    ml = {"is_threat": True, "confidence": 0.72, "category": "phishing", "reasons": ["x"]}
    out = hybrid_predict("ভুয়া লটারি bit.ly", ml)
    assert out["is_threat"] is True
