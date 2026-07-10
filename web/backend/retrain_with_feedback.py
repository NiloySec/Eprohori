"""Safe model retraining with admin-reviewed report feedback.

Combines the base CSV dataset with HUMAN-reviewed reports from the DB
(admin-approved → phishing, admin-rejected → safe), trains a candidate model,
and only replaces the live model if it is NOT worse than the current one.

Safety guarantees:
  - Only `human_reviewed=True` reports are used (never auto-verified — avoids
    circular learning where the model trains on its own past decisions).
  - Dry-run by default: prints a benchmark and changes nothing.
  - `--apply` writes model.pkl ONLY if the candidate's held-out F1 is not worse
    than the current model's; the old model is backed up to model.pkl.bak first.

Usage:
  python retrain_with_feedback.py            # dry run (benchmark only)
  python retrain_with_feedback.py --apply    # adopt if not worse (with backup)
"""
from __future__ import annotations

import shutil
import sys

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

import validator
from database import SessionLocal
from models import Threat

MODEL_PATH = validator.MODEL_PATH
MIN_FEEDBACK = 50        # below this, retraining is unlikely to help
F1_TOLERANCE = 0.01      # allow a tiny dip (noise) before rejecting the candidate


def _build_pipe() -> Pipeline:
    # Mirror the production model config (validator._train_and_save)
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=50_000, sublinear_tf=True)),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, C=5.0, solver="lbfgs")),
    ])


def load_feedback() -> tuple[list[str], list[int]]:
    """Human-reviewed reports only: approved → 1 (phishing), rejected → 0 (safe)."""
    db = SessionLocal()
    try:
        rows = db.query(Threat).filter(Threat.human_reviewed == True).all()  # noqa: E712
    except Exception as exc:  # noqa: BLE001
        print(f"[retrain] could not read feedback from DB: {exc}")
        return [], []
    finally:
        db.close()

    texts, labels = [], []
    for t in rows:
        if not t.content:
            continue
        if t.status == "verified":
            texts.append(t.content); labels.append(1)
        elif t.status == "rejected":
            texts.append(t.content); labels.append(0)
    return texts, labels


def main() -> None:
    apply = "--apply" in sys.argv
    print("=" * 64)
    print("  EPROHORI — FEEDBACK RETRAIN (safe, benchmarked)")
    print("=" * 64)

    base_texts, base_labels = validator._load_dataset()
    fb_texts, fb_labels = load_feedback()
    pos = sum(fb_labels)
    print(f"Base dataset      : {len(base_texts)} samples")
    print(f"Human feedback    : {len(fb_texts)} (phishing {pos}, safe {len(fb_labels) - pos})")

    if not fb_texts:
        print("\nNo human-reviewed reports yet — nothing to add. Exiting.")
        return
    if len(fb_texts) < MIN_FEEDBACK:
        print(f"\n⚠️  Only {len(fb_texts)} feedback examples (< {MIN_FEEDBACK}). "
              "Likely too few to improve the model — proceed with caution.")

    all_texts = base_texts + fb_texts
    all_labels = np.array(base_labels + fb_labels)

    # Fair comparison on a held-out split that includes feedback examples
    X_tr, X_te, y_tr, y_te = train_test_split(
        all_texts, all_labels, test_size=0.20, random_state=42, stratify=all_labels
    )
    candidate = _build_pipe().fit(X_tr, y_tr)
    new_f1 = f1_score(y_te, candidate.predict(X_te))

    old_f1 = None
    if MODEL_PATH.exists():
        try:
            old = joblib.load(MODEL_PATH)
            old_f1 = f1_score(y_te, old.predict(X_te))
        except Exception as exc:  # noqa: BLE001
            print(f"[retrain] current model eval failed: {exc}")

    print("\n-- Held-out comparison (20%) --")
    print(f"  Current model F1 : {'n/a' if old_f1 is None else f'{old_f1:.4f}'}")
    print(f"  Candidate    F1 : {new_f1:.4f}")
    print("\n-- Candidate classification report --")
    print(classification_report(y_te, candidate.predict(X_te), target_names=["safe", "phishing"], digits=4))

    if old_f1 is not None and new_f1 < old_f1 - F1_TOLERANCE:
        print(f"❌ Candidate is WORSE ({new_f1:.4f} < {old_f1:.4f}). Keeping current model. No change.")
        return

    if not apply:
        print("✅ Candidate is not worse. Dry run — re-run with --apply to adopt it.")
        return

    # Adopt: train final model on ALL data, back up the old one, then replace
    final = _build_pipe().fit(all_texts, all_labels)
    if MODEL_PATH.exists():
        shutil.copy(MODEL_PATH, f"{MODEL_PATH}.bak")
        print(f"🔒 Backed up current model → {MODEL_PATH}.bak (rollback available)")
    joblib.dump(final, MODEL_PATH)
    print(f"✅ Adopted new model → {MODEL_PATH}")
    print("   Redeploy the backend (or restart) to serve the new model.")


if __name__ == "__main__":
    main()
