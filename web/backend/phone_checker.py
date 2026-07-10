"""Stubbed phone-scam checker.

Returns a benign default so existing callers and the
`/api/check/phone` endpoint keep working without any dataset or
PhoneBlacklist table dependency.
"""


def load_blacklist() -> None:
    """No-op — the blacklist table is no longer populated from CSV."""
    return None


# Pattern matching for known scammer behavior
# 1. VoIP/Virtual numbers frequently used by scammers
_VOIP_PREFIXES = {"013", "014"}  # Examples, often rotated

def analyze_call_pattern(number: str, recent_reports_count: int) -> dict:
    """
    Advanced pattern analysis for a phone number.
    Returns probability of being a spammer/bot.
    """
    clean_num = re.sub(r"\D", "", number)
    score = 0.0
    indicators = []

    # Rule 1: High frequency reporting (Crowdsourced signal)
    if recent_reports_count > 50:
        score += 0.8
        indicators.append("অস্বাভাবিক কল ফ্রিকোয়েন্সি (গণ-রিপোর্ট)")
    elif recent_reports_count > 10:
        score += 0.4
        indicators.append("সন্দেহজনক কার্যক্রম শনাক্ত হয়েছে")

    # Rule 2: Non-standard length or format
    if len(clean_num) != 11:
        score += 0.3
        indicators.append("অস্বাভাবিক নম্বর ফরম্যাট")

    # Rule 3: Known scammer prefix rotation
    if clean_num.startswith("096"): # IP Phone/VSP often used for bulk spam
        score += 0.2
        indicators.append("VSP/IP ফোন নম্বর (বাল্ক স্প্যামের সম্ভাবনা)")

    is_scam = score >= 0.5

    return {
        "scam_probability": min(score, 0.99),
        "is_scam": is_scam,
        "indicators": indicators,
        "category": "spam" if is_scam else "unknown"
    }


def check_phone(number: str) -> dict:
    """Always returns 'not in blacklist' — the dataset is gone."""
    return {
        "number": number,
        "is_scam": False,
        "message": "✅ নম্বরটি আমাদের স্ক্যাম তালিকায় নেই।",
    }
