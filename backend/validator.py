"""
TF-IDF + Logistic Regression phishing/spam detector.
Trained on three Bengali datasets combined (~5,772 rows):
  - BangalaBarta bangla_spam_sms smishing.csv  (smish/promo → 1, normal → 0)
  - bangla_phishing_dataset_v2_20260307_0954.csv  (label already 0/1)
  - bangla_phishing_dataset_v2_20260307_0956.csv  (label already 0/1)
"""

import re
import threading
import joblib
import pandas as pd
from pathlib import Path
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

DATA_DIR = Path(__file__).parent / "data"
MODEL_PATH = Path(__file__).parent / "model.pkl"

_model: Pipeline | None = None
_lock = threading.Lock()


# ── Dataset loading ────────────────────────────────────────────────────────────

def _load_dataset() -> tuple[list[str], list[int]]:
    texts: list[str] = []
    labels: list[int] = []

    # 1. BangalaBarta — label column is string: smish/promo → 1, normal → 0
    df1 = pd.read_csv(
        DATA_DIR / "BangalaBarta bangla_spam_sms smishing.csv",
        encoding="utf-8",
        on_bad_lines="skip",
    )
    for _, row in df1.iterrows():
        texts.append(str(row["text"]))
        labels.append(0 if str(row["label"]).strip() == "normal" else 1)

    # 2. Phishing dataset v0954 — label is already int 0/1
    df2 = pd.read_csv(
        DATA_DIR / "bangla_phishing_dataset_v2_20260307_0954.csv",
        encoding="utf-8",
        on_bad_lines="skip",
    )
    for _, row in df2.iterrows():
        texts.append(str(row["text"]))
        labels.append(int(row["label"]))

    # 3. Phishing dataset v0956 — label is already int 0/1
    df3 = pd.read_csv(
        DATA_DIR / "bangla_phishing_dataset_v2_20260307_0956.csv",
        encoding="utf-8",
        on_bad_lines="skip",
    )
    for _, row in df3.iterrows():
        texts.append(str(row["text"]))
        labels.append(int(row["label"]))

    return texts, labels


# ── Training ───────────────────────────────────────────────────────────────────

def _train_and_save() -> Pipeline:
    print("[validator] Training phishing model...")
    texts, labels = _load_dataset()
    pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    max_features=50_000,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    class_weight="balanced",
                    max_iter=1000,
                    C=5.0,
                    solver="lbfgs",
                ),
            ),
        ]
    )
    pipe.fit(texts, labels)
    joblib.dump(pipe, MODEL_PATH)
    print(f"[validator] Model saved -> {MODEL_PATH}")
    return pipe


# ── Lazy loader (double-checked locking) ──────────────────────────────────────

def _get_model() -> Pipeline:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                if MODEL_PATH.exists():
                    print("[validator] Loading cached model...")
                    _model = joblib.load(MODEL_PATH)
                else:
                    _model = _train_and_save()
    return _model


# ── Reason extraction ─────────────────────────────────────────────────────────

def _get_reasons(text: str, score: float) -> list[str]:
    reasons: list[str] = []
    if re.search(r"https?://", text):
        reasons.append("সংক্ষিপ্ত/সন্দেহজনক URL পাওয়া গেছে")
    if re.search(r"(জরুরি|urgent|URGENT|এখনই|deadline)", text, re.IGNORECASE):
        reasons.append("জরুরিতার ভাষা ব্যবহার করা হয়েছে")
    if re.search(r"(পুরস্কার|prize|winner|বিজয়ী|লটারি|lottery)", text, re.IGNORECASE):
        reasons.append("পুরস্কার/লটারির প্রলোভন পাওয়া গেছে")
    if re.search(
        r"(ব্যাংক|bank|account|একাউন্ট|OTP|পিন|PIN|bKash|nagad|নগদ|card)",
        text,
        re.IGNORECASE,
    ):
        reasons.append("আর্থিক/ব্যাংকিং তথ্য সংক্রান্ত অনুরোধ")
    if re.search(r"(ফ্রি|free|FREE|বিনামূল্যে)", text, re.IGNORECASE):
        reasons.append("বিনামূল্যে অফার (সাধারণ প্রতারণার ফাঁদ)")
    if re.search(r"(বৃত্তি|scholarship|টাকা পাঠান|send money)", text, re.IGNORECASE):
        reasons.append("বৃত্তি/অর্থ প্রেরণের প্রলোভন")
    if score > 0.80:
        reasons.append(f"AI উচ্চ ঝুঁকি স্কোর ({score:.0%}) নির্ধারণ করেছে")
    return reasons[:3] or ["AI বিশ্লেষণে সন্দেহজনক প্যাটার্ন পাওয়া গেছে"]


# ── Rule-based confidence booster ─────────────────────────────────────────────

def _rule_signals(text: str) -> int:
    """Count how many strong phishing signals are present in the text."""
    signals = 0
    if re.search(r"\.(tk|xyz|click|ga|ml|cf|gq|pw|top|loan|win|bid)\b|bit\.ly|tinyurl|shorturl", text, re.IGNORECASE):
        signals += 2  # suspicious domain — strong signal
    if re.search(r"(জরুরি|এখনই|বন্ধ হবে|সীমিত|শেষ সুযোগ|urgent|immediately|expire|block|limited)", text, re.IGNORECASE):
        signals += 1
    if re.search(r"(পুরস্কার|prize|winner|বিজয়ী|লটারি|lottery|টাকা জিত|cash\s*reward)", text, re.IGNORECASE):
        signals += 1
    if re.search(r"(OTP|পিন\b|PIN\b|পাসওয়ার্ড|password|card.?number|কার্ড নম্বর|nid|NID)", text, re.IGNORECASE):
        signals += 2  # credential request — strong signal
    if re.search(r"(bkash|bikash|b-kash|nagad|surecash|rocket|dutch.?bangla|dbbl|sonali.?bank)", text, re.IGNORECASE):
        signals += 1
    if re.search(r"(ব্লক|block|বন্ধ হয়ে|suspend|ভেরিফাই|verify)\s*(হ|করুন|করতে|হবে)", text, re.IGNORECASE):
        signals += 1
    return signals


# ── Known-safe whitelists (checked BEFORE the ML model) ──────────────────────

SAFE_DOMAINS = [
    'google.com', 'facebook.com', 'youtube.com',
    'bkash.com', 'nagad.com.bd', 'rocket.com.bd',
    'dutchbanglabank.com', 'gov.bd', 'wikipedia.org',
    'microsoft.com', 'apple.com', 'amazon.com',
    'whatsapp.com', 'instagram.com', 'twitter.com',
    'linkedin.com', 'github.com', 'grameenphone.com',
    'robi.com.bd', 'banglalink.net', 'teletalk.com.bd',
    'duet.ac.bd', 'bb.org.bd',
]

# Institutional Bangladeshi TLDs — any .gov.bd / .ac.bd / .edu.bd etc. is safe
SAFE_DOMAIN_PATTERNS = [
    r'\.gov\.bd$', r'\.ac\.bd$', r'\.edu\.bd$',
    r'\.org\.bd$', r'\.mil\.bd$',
]


def is_known_safe(text: str) -> bool:
    domain_match = re.search(
        r'(?:https?://)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
        text,
    )
    if domain_match:
        domain = domain_match.group(1).lower()
        # Exact or subdomain match
        if any(domain == d or domain.endswith('.' + d) for d in SAFE_DOMAINS):
            return True
        # TLD pattern match (any .ac.bd, .gov.bd etc.)
        if any(re.search(p, domain) for p in SAFE_DOMAIN_PATTERNS):
            return True
    return False


# Transactional / service SMS patterns: notifications that ASK for nothing
SAFE_SMS_PATTERNS = [
    # Bank/MFS transaction confirmations (NO action requested)
    r'(আপনার একাউন্টে|আপনার এ্যাকাউন্টে|আপনার অ্যাকাউন্টে).*জমা হয়েছে',
    r'টাকা (পেয়েছেন|পাঠিয়েছেন|গ্রহণ করেছেন)',
    r'(received|sent|credited|debited).*(tk|taka|৳)',
    r'balance.*(is|হল|আছে)',
    r'আপনার ব্যালেন্স',
    # Cashback/offer WITHOUT urgency+link combo
    r'(cashback|ক্যাশব্যাক).*(পেয়েছেন|পাবেন|যুক্ত হয়েছে)',
    r'(bonus|বোনাস).*(যুক্ত হয়েছে|পেয়েছেন)',
    # SIM operator service messages
    r'(minute|মিনিট|এমবি|MB|GB|জিবি).*(যুক্ত|ব্যবহার|অবশিষ্ট|পেয়েছেন|বোনাস)',
    r'(internet|ইন্টারনেট)\s*(প্যাক|pack|বোনাস)',
    r'(রিচার্জ|recharge).*(সফল|successful)',
]


def is_safe_transactional_sms(text: str) -> bool:
    # OTP/PIN request combined with a link → NEVER safe, even if it
    # otherwise looks transactional
    danger_signals = re.search(
        r'(OTP|পিন|PIN|click|ক্লিক|verify|যাচাই করুন).*'
        r'(bit\.ly|tinyurl|\.tk|\.xyz|http)',
        text, re.IGNORECASE,
    )
    if danger_signals:
        return False

    return any(re.search(p, text, re.IGNORECASE) for p in SAFE_SMS_PATTERNS)


# ── Public API ─────────────────────────────────────────────────────────────────

def predict(text: str) -> dict:
    # Known-safe domains skip the model entirely — no false positives on
    # google.com / bkash.com / *.gov.bd / *.ac.bd etc.
    if is_known_safe(text):
        return {
            "is_threat": False,
            "confidence": 0.02,
            "category": "safe",
            "risk": "low",
            "reasons": [],
        }

    # Transactional / service notifications (bank confirmations, operator
    # bonus messages, recharge receipts) are normal — not phishing.
    if is_safe_transactional_sms(text):
        return {
            "is_threat": False,
            "confidence": 0.05,
            "category": "safe",
            "risk": "low",
            "reasons": [],
        }

    model = _get_model()
    ml_prob = float(model.predict_proba([text])[0][1])

    # Rule-based signal boost
    signals = _rule_signals(text)
    rule_boost = min(signals * 0.12, 0.50)   # up to +0.50 from rules
    prob = min(ml_prob + rule_boost, 0.99)
    pct = prob * 100

    # Recalibrated thresholds (less trigger-happy):
    #   >=75 critical, >=55 high  → flagged as threat
    #   35-55 medium              → NOT flagged (watch, don't accuse)
    #   <35  low                  → safe
    if pct >= 75:
        is_threat, risk = True, "critical"
    elif pct >= 55:
        is_threat, risk = True, "high"
    elif pct >= 35:
        is_threat, risk = False, "medium"
    else:
        is_threat, risk = False, "low"

    reasons = _get_reasons(text, prob)
    return {
        "is_threat": is_threat,
        "confidence": round(prob, 4),
        "category": "phishing" if is_threat else "safe",
        "risk": risk,
        "reasons": reasons if is_threat else [],
    }


def preload() -> None:
    """Call once at startup (in a background thread) to warm the model."""
    _get_model()
