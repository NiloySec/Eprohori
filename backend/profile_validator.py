"""
Random Forest spam-profile detector.
Trained on Facebook Spam Dataset.csv (600 rows, Label 0=normal / 1=spam).

Schema fields          → CSV column
─────────────────────────────────────
friends                → #friends
following              → #following
community              → #community
age                    → age
posts_shared           → #postshared
url_shared             → #urlshared
photos_videos          → #photos/videos
fp_urls                → fpurls
fp_photos_videos       → fpphotos/videos
avg_comment            → avgcomment/post
likes                  → likes/post
tags                   → tags/post
num_tags               → #tags/post
"""

import threading
import joblib
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL_PATH = Path(__file__).parent / "profile_model.pkl"

# Must match the DataFrame column order used during training
FEATURE_COLS = [
    "#friends",
    "#following",
    "#community",
    "age",
    "#postshared",
    "#urlshared",
    "#photos/videos",
    "fpurls",
    "fpphotos/videos",
    "avgcomment/post",
    "likes/post",
    "tags/post",
    "#tags/post",
]

# Schema field name → CSV column name
SCHEMA_TO_COL: dict[str, str] = {
    "friends": "#friends",
    "following": "#following",
    "community": "#community",
    "age": "age",
    "posts_shared": "#postshared",
    "url_shared": "#urlshared",
    "photos_videos": "#photos/videos",
    "fp_urls": "fpurls",
    "fp_photos_videos": "fpphotos/videos",
    "avg_comment": "avgcomment/post",
    "likes": "likes/post",
    "tags": "tags/post",
    "num_tags": "#tags/post",
}
# Reverse map for quick lookup: CSV column → schema field key
COL_TO_SCHEMA: dict[str, str] = {v: k for k, v in SCHEMA_TO_COL.items()}

_model: RandomForestClassifier | None = None
_lock = threading.Lock()


# ── Training ───────────────────────────────────────────────────────────────────

def _train_and_save() -> RandomForestClassifier:
    print("[profile_validator] Training spam-profile model…")
    df = pd.read_csv(DATA_DIR / "Facebook Spam Dataset.csv")
    X = df[FEATURE_COLS].fillna(0)
    y = df["Label"]
    clf = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    clf.fit(X, y)
    joblib.dump(clf, MODEL_PATH)
    print(f"[profile_validator] Model saved → {MODEL_PATH}")
    return clf


# ── Lazy loader ────────────────────────────────────────────────────────────────

def _get_model() -> RandomForestClassifier:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                if MODEL_PATH.exists():
                    print("[profile_validator] Loading cached model…")
                    _model = joblib.load(MODEL_PATH)
                else:
                    _model = _train_and_save()
    return _model


# ── Public API ─────────────────────────────────────────────────────────────────

def predict(features: dict) -> dict:
    """
    features: dict with schema field names (friends, following, …)
    Returns: {is_spam, confidence, reasons}
    """
    model = _get_model()

    # Build row in FEATURE_COLS order using schema → col mapping
    row = [float(features.get(COL_TO_SCHEMA[col], 0)) for col in FEATURE_COLS]
    prob = float(model.predict_proba([row])[0][1])
    is_spam = prob > 0.5

    reasons: list[str] = []
    if is_spam:
        if features.get("url_shared", 0) > 100:
            reasons.append("অস্বাভাবিক সংখ্যক URL শেয়ার করা হয়েছে")
        if features.get("following", 0) > 5000:
            reasons.append("অতিরিক্ত সংখ্যক একাউন্ট ফলো করা হচ্ছে")
        if features.get("fp_urls", 0) > 50:
            reasons.append("প্রোফাইলে অতিরিক্ত URL পাওয়া গেছে")
        if features.get("posts_shared", 0) > 500:
            reasons.append("অস্বাভাবিক বেশি পোস্ট শেয়ার করা হয়েছে")
        if prob > 0.80:
            reasons.append(f"AI স্প্যাম স্কোর {prob:.0%}")
        reasons = reasons[:3] or ["AI বিশ্লেষণে স্প্যাম প্যাটার্ন সনাক্ত হয়েছে"]

    return {
        "is_spam": is_spam,
        "confidence": round(prob, 4),
        "reasons": reasons,
    }


def preload() -> None:
    """Call once at startup (in a background thread) to warm the model."""
    _get_model()
