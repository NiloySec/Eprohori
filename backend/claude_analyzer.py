"""
Hybrid AI analysis for the text validator — multi-provider fallback.

Provider chain (same as the chatbot): Groq → Gemini → Claude

Two jobs in a single API call:
  1. Second opinion — when the ML model is uncertain (confidence 0.35–0.65),
     the AI re-classifies the Bengali message and its verdict wins.
  2. Explanation — when a message is flagged as a threat, the AI writes a
     short user-facing Bengali explanation of why it looks like phishing.

Degrades gracefully: if no provider key is set or every call fails,
analyze() returns None and the caller keeps the ML-only result.
"""

import json
import os
import re

import httpx
from pydantic import BaseModel, Field, ValidationError

# Confidence band where the TF-IDF model is considered uncertain.
# validator.predict() floors threat confidence at 0.55, so this band covers
# borderline-safe (0.35–0.45) and borderline-threat (0.55–0.65) cases.
UNCERTAIN_LOW = 0.35
UNCERTAIN_HIGH = 0.65

GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-2.5-flash"
CLAUDE_MODEL = "claude-opus-4-8"


class AIAnalysis(BaseModel):
    is_threat: bool = Field(description="True if the message is phishing/smishing/spam")
    confidence: float = Field(description="Probability the message is a threat, 0.0 to 1.0")
    category: str = Field(description='"phishing", "smishing", "spam", or "safe"')
    explanation_bn: str = Field(
        description="2-3 sentence explanation in Bengali, written for a general audience. "
        "If safe, briefly say why it appears safe."
    )
    reasons_bn: list[str] = Field(
        description="Up to 3 short Bengali bullet points naming the specific red flags "
        "(suspicious link, urgency, OTP request, etc.). Empty list if safe."
    )


SYSTEM_PROMPT = """\
You are the AI analyst for EProhori, Bangladesh's crowdsourced cyber-threat platform.
You analyze SMS/text messages (mostly Bengali, sometimes English or mixed) for phishing,
smishing, and scam patterns common in Bangladesh: fake bKash/Nagad/Rocket alerts,
OTP/PIN harvesting, lottery and prize lures, fake bank account-block warnings,
shortened or look-alike URLs, scholarship and job scams.

You receive the message plus the verdict of a TF-IDF + Logistic Regression model.
Form your own judgment — do not simply agree with the ML model, especially when it
is uncertain. Legitimate transactional SMS (real bank/MFS confirmations, OTP delivery
from the actual operator, delivery notifications) must not be flagged just for
mentioning money or banks.

All user-facing text (explanation_bn, reasons_bn) must be in natural Bengali."""

JSON_INSTRUCTIONS = """\
Respond with ONLY a JSON object, no markdown fences, exactly this shape:
{"is_threat": true|false, "confidence": 0.0-1.0, "category": "phishing"|"smishing"|"spam"|"safe", \
"explanation_bn": "<2-3 sentence Bengali explanation>", "reasons_bn": ["<Bengali red flag>", ...]}
reasons_bn must be an empty list if the message is safe."""


def _user_message(text: str, ml_result: dict) -> str:
    return (
        f"Message to analyze:\n<message>\n{text}\n</message>\n\n"
        f"ML model verdict: {ml_result['category']} "
        f"(confidence {ml_result['confidence']:.2f})"
    )


def _parse_json_analysis(raw: str) -> AIAnalysis:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return AIAnalysis(**json.loads(cleaned))


# ── Providers ─────────────────────────────────────────────────────────────────

def _call_groq(text: str, ml_result: dict) -> AIAnalysis | None:
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        return None
    resp = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + JSON_INSTRUCTIONS},
                {"role": "user", "content": _user_message(text, ml_result)},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return _parse_json_analysis(resp.json()["choices"][0]["message"]["content"])


def _call_gemini(text: str, ml_result: dict) -> AIAnalysis | None:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None
    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key}",
        headers={"Content-Type": "application/json"},
        json={
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT + "\n\n" + JSON_INSTRUCTIONS}]},
            "contents": [{"role": "user", "parts": [{"text": _user_message(text, ml_result)}]}],
            "generationConfig": {"responseMimeType": "application/json", "maxOutputTokens": 1024},
        },
        timeout=30,
    )
    resp.raise_for_status()
    return _parse_json_analysis(resp.json()["candidates"][0]["content"]["parts"][0]["text"])


def _call_claude(text: str, ml_result: dict) -> AIAnalysis | None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    import anthropic  # lazy: only needed when a Claude key is configured

    client = anthropic.Anthropic()
    response = client.messages.parse(
        model=CLAUDE_MODEL,
        max_tokens=2048,
        thinking={"type": "adaptive"},
        output_config={"effort": "low"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _user_message(text, ml_result)}],
        output_format=AIAnalysis,
    )
    return response.parsed_output


_PROVIDERS = [
    ("groq", _call_groq),
    ("gemini", _call_gemini),
    ("claude", _call_claude),
]


def is_enabled() -> bool:
    return any(
        os.environ.get(k) for k in ("GROQ_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY")
    )


# ── Real-brand domain resolver (for impersonation URLs) ───────────────────────
# Identifies the OFFICIAL website a phishing URL is trying to impersonate, for
# brands not in the static url_heuristics.BRANDS dict. Groq-first (fast/cheap),
# Gemini fallback. Returns a bare host like "bkash.com", or None.

_DOMAIN_RE = re.compile(r"^(?:https?://)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})", re.I)


def _clean_domain(raw: str) -> str | None:
    m = _DOMAIN_RE.match((raw or "").strip().lower())
    if not m:
        return None
    host = m.group(1)
    # reject obvious non-answers
    if host in {"none", "unknown", "n/a", "example.com"} or " " in host:
        return None
    return host


def _brand_prompt(scanned_host: str) -> str:
    return (
        "A user scanned this suspicious URL host: "
        f"'{scanned_host}'.\n"
        "It looks like it may impersonate a well-known brand (bank, MFS, tech, social, "
        "shopping, etc.), especially Bangladeshi ones. If it clearly imitates a real brand, "
        "reply with ONLY that brand's official domain (e.g. \"bkash.com\"). "
        "If it does NOT clearly impersonate any known brand, reply with exactly \"NONE\". "
        "No explanation, no extra words — just the domain or NONE."
    )


def _groq_domain(scanned_host: str) -> str | None:
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        return None
    resp = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": _brand_prompt(scanned_host)}],
            "temperature": 0.0,
            "max_tokens": 32,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return _clean_domain(resp.json()["choices"][0]["message"]["content"])


def _gemini_domain(scanned_host: str) -> str | None:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None
    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"role": "user", "parts": [{"text": _brand_prompt(scanned_host)}]}],
            "generationConfig": {"maxOutputTokens": 32, "temperature": 0.0},
        },
        timeout=15,
    )
    resp.raise_for_status()
    return _clean_domain(resp.json()["candidates"][0]["content"]["parts"][0]["text"])


def find_official_domain(scanned_host: str) -> str | None:
    """Best-effort: the official domain a suspicious host impersonates, or None.
    Groq → Gemini. Degrades silently if no key / every call fails."""
    if not scanned_host:
        return None
    for name, call in (("groq", _groq_domain), ("gemini", _gemini_domain)):
        try:
            host = call(scanned_host)
            # Guard: don't return the scanned host itself as its own "real" site.
            if host and host != scanned_host.lower().lstrip("www."):
                return host
        except Exception as e:  # noqa: BLE001
            print(f"[brand_resolver] {name} failed: {e}")
    return None


def analyze(text: str, ml_result: dict) -> tuple[str, AIAnalysis] | None:
    """Try each provider in order. Returns (provider_name, analysis) or None."""
    for name, call in _PROVIDERS:
        try:
            result = call(text, ml_result)
            if result is not None:
                return name, result
        except (httpx.HTTPError, ValidationError, KeyError, json.JSONDecodeError, Exception) as e:  # noqa: BLE001
            print(f"[ai_analyzer] {name} failed, trying next provider: {e}")
    return None


def hybrid_predict(text: str, ml_result: dict) -> dict:
    """
    Combine the ML verdict with the AI second opinion.

    - Clearly safe (confidence < 0.35, not flagged): skip AI, return ML as-is.
    - Uncertain band: the AI verdict overrides the ML verdict.
    - Flagged as threat: keep the verdict, attach the AI's Bengali explanation.
    """
    confidence = ml_result["confidence"]
    uncertain = UNCERTAIN_LOW <= confidence <= UNCERTAIN_HIGH

    if not uncertain and not ml_result["is_threat"]:
        return {**ml_result, "source": "ml", "explanation": None}

    analyzed = analyze(text, ml_result)
    if analyzed is None:
        return {**ml_result, "source": "ml", "explanation": None}
    provider, ai = analyzed

    if uncertain:
        # The AI is the tiebreaker — its verdict wins.
        is_threat = ai.is_threat
        ai_conf = ai.confidence
        # Guard: some models report "certainty of my verdict" instead of
        # "threat probability" — for a safe verdict, keep it on the low side.
        if not is_threat and ai_conf > 0.5:
            ai_conf = 1 - ai_conf
        confidence = round(ai_conf, 4)
        category = ai.category if is_threat else "safe"
        reasons = ai.reasons_bn[:3] if is_threat else []
    else:
        # ML was confident it's a threat — keep its verdict, enrich the reasons.
        is_threat = ml_result["is_threat"]
        category = ml_result["category"]
        # Consistency guard: if ML flags a threat on a MODERATE score (< 0.85) but
        # the AI confidently disagrees, defer to the AI. This prevents clearly-safe
        # messages (e.g. "class at 9am") that the linear model over-scores from being
        # labelled phishing with a contradicting "this is safe" explanation.
        # Strong ML threats (>= 0.85) always stand, so real attacks aren't suppressed.
        if is_threat and not ai.is_threat and confidence < 0.85:
            is_threat = False
            category = "safe"
            confidence = round(min(confidence, 0.30), 4)
            reasons = []
        else:
            reasons = (ai.reasons_bn[:3] or ml_result["reasons"]) if is_threat else []

    return {
        "is_threat": is_threat,
        "confidence": confidence,
        "category": category,
        "reasons": reasons,
        "explanation": ai.explanation_bn,
        "source": f"ml+{provider}",
    }
