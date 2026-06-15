"""Stubbed profile-spam validator.

Returns a benign default so existing callers and the
`/api/validate/profile` endpoint keep working without any dataset or
sklearn dependency.
"""


def predict(features: dict) -> dict:
    """Always returns a 'not spam' result — feature payload is ignored."""
    return {
        "is_spam": False,
        "confidence": 0.0,
        "reasons": [],
    }


def preload() -> None:
    """No-op — there is no model to warm up."""
    return None
