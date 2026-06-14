"""
Phone number scam checker.
Loads scam_phone_numbers_dataset.csv into the PhoneBlacklist table on first run
(idempotent — skips if table already has rows).
"""

import re
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def _clean(number: str) -> str:
    """Strip spaces, dashes, parens; remove leading zeros; keep +."""
    cleaned = re.sub(r"[^\d+]", "", str(number))
    # Remove leading 0s but keep a leading + if present
    if cleaned.startswith("+"):
        return "+" + cleaned[1:].lstrip("0")
    return cleaned.lstrip("0")


def load_blacklist() -> None:
    """Idempotent: populate PhoneBlacklist from CSV if table is empty."""
    # Import here to avoid circular import at module level
    from database import SessionLocal
    from models import PhoneBlacklist

    db = SessionLocal()
    try:
        if db.query(PhoneBlacklist).count() > 0:
            return  # already loaded

        df = pd.read_csv(DATA_DIR / "scam_phone_numbers_dataset.csv")
        added = 0
        for _, row in df.iterrows():
            cleaned = _clean(str(row["phone_number"]))
            if cleaned and not db.query(PhoneBlacklist).filter_by(phone_number=cleaned).first():
                db.add(PhoneBlacklist(phone_number=cleaned))
                added += 1
        db.commit()
        print(f"[phone_checker] Loaded {added} scam numbers into DB")
    except Exception as exc:
        db.rollback()
        print(f"[phone_checker] ERROR loading blacklist: {exc}")
    finally:
        db.close()


def check_phone(number: str) -> dict:
    from database import SessionLocal
    from models import PhoneBlacklist

    cleaned = _clean(number)
    db = SessionLocal()
    try:
        found = db.query(PhoneBlacklist).filter_by(phone_number=cleaned).first()
        return {
            "number": number,
            "is_scam": found is not None,
            "message": (
                "⚠️ এই নম্বরটি আমাদের স্ক্যাম তালিকায় রয়েছে। সতর্ক থাকুন!"
                if found
                else "✅ নম্বরটি আমাদের স্ক্যাম তালিকায় নেই।"
            ),
        }
    finally:
        db.close()
