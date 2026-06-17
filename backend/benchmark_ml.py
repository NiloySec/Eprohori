"""ML accuracy benchmark for the phishing validator.

Trains on a stratified 80% split and evaluates on the held-out 20% —
reports precision / recall / F1 / accuracy + confusion matrix and a 5-fold
cross-validated F1 so the numbers are defensible (not train-on-test).

Run:  python benchmark_ml.py
"""
from __future__ import annotations

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline

import validator


def _build_pipe() -> Pipeline:
    # Mirror the production model config (validator._train_and_save)
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=50_000, sublinear_tf=True)),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, C=5.0, solver="lbfgs")),
    ])


def main() -> None:
    texts, labels = validator._load_dataset()
    y = np.array(labels)
    n = len(texts)
    pos = int(y.sum())
    print("=" * 64)
    print("  EPROHORI PHISHING MODEL — ACCURACY BENCHMARK")
    print("=" * 64)
    print(f"Samples: {n}   phishing/spam: {pos} ({pos / n:.1%})   ham: {n - pos}")

    X_tr, X_te, y_tr, y_te = train_test_split(
        texts, y, test_size=0.20, random_state=42, stratify=y
    )
    pipe = _build_pipe()
    pipe.fit(X_tr, y_tr)
    y_pred = pipe.predict(X_te)

    print("\n-- Held-out test set (20%) --")
    print(classification_report(y_te, y_pred, target_names=["ham", "phishing"], digits=4))

    tn, fp, fn, tp = confusion_matrix(y_te, y_pred).ravel()
    print("Confusion matrix (held-out):")
    print(f"  TN={tn}  FP={fp}")
    print(f"  FN={fn}  TP={tp}")
    if (tp + fp):
        print(f"  Precision (phishing): {tp / (tp + fp):.4f}")
    if (tp + fn):
        print(f"  Recall    (phishing): {tp / (tp + fn):.4f}")

    print("\n-- 5-fold cross-validated F1 (whole dataset) --")
    f1 = cross_val_score(_build_pipe(), texts, y, cv=5, scoring="f1")
    print(f"  F1 per fold: {[round(float(s), 4) for s in f1]}")
    print(f"  Mean F1: {f1.mean():.4f}  (+/- {f1.std():.4f})")
    print("=" * 64)


if __name__ == "__main__":
    main()
