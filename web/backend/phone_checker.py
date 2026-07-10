"""Stubbed phone-scam checker.

Returns a benign default so existing callers and the
`/api/check/phone` endpoint keep working without any dataset or
PhoneBlacklist table dependency.
"""


def load_blacklist() -> None:
    """No-op — the blacklist table is no longer populated from CSV."""
    return None


def check_phone(number: str) -> dict:
    """Always returns 'not in blacklist' — the dataset is gone."""
    return {
        "number": number,
        "is_scam": False,
        "message": "✅ নম্বরটি আমাদের স্ক্যাম তালিকায় নেই।",
    }
