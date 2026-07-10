# Phishing Model — Accuracy Benchmark

Reproduce: `python benchmark_ml.py` (stratified 80/20 split, seed 42).

## Held-out test set (20%, 1,155 samples)

| Metric | ham | phishing |
|--------|-----|----------|
| Precision | 0.9923 | **0.9935** |
| Recall | 0.9872 | **0.9961** |
| F1 | 0.9898 | **0.9948** |

**Accuracy: 0.9931**

Confusion matrix: TN=387, FP=5, FN=3, TP=760
→ only 3 phishing messages missed (false negatives), 5 false alarms.

## 5-fold cross-validated F1 (whole dataset, 5,772 samples)

Per fold: 0.9837, 0.9857, 0.9928, 1.0, 1.0
**Mean F1: 0.9924 (± 0.0069)**

## Dataset

5,772 labelled Bangla messages — 3,815 phishing/spam (66.1%), 1,957 ham.
Sources: BangalaBarta smishing corpus + 2 Bangla phishing datasets.

## Caveats (honest)

- Metrics reflect the **training data distribution**; real-world traffic may
  include novel attack patterns not represented here. Treat as an upper bound.
- The model is TF-IDF + Logistic Regression — fast and accurate on this corpus,
  but it does not understand URLs/domains semantically. The rule-based booster
  (`validator.py`) and the multi-LLM hybrid layer (`claude_analyzer.py`) cover
  cases the linear model alone would miss.
- Re-run this benchmark whenever the dataset changes; never train on test data.
