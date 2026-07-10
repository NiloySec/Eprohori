"""Unit tests for the daily quiz rotation/grading and domain normalization (pure)."""
from datetime import date

import quiz_bank
import domain_cache


def test_bank_has_enough_questions():
    assert len(quiz_bank.QUESTIONS) >= 40


def test_daily_indices_five_distinct():
    idx = quiz_bank.daily_indices(date(2026, 6, 22))
    assert len(idx) == 5
    assert len(set(idx)) == 5


def test_consecutive_days_do_not_overlap():
    d0 = set(quiz_bank.daily_indices(date(2026, 6, 22)))
    d1 = set(quiz_bank.daily_indices(date(2026, 6, 23)))
    assert d0.isdisjoint(d1)


def test_daily_questions_hide_answers():
    qs = quiz_bank.daily_questions(date(2026, 6, 22))
    assert len(qs) == 5
    for q in qs:
        assert "answer" not in q          # correct answer must stay server-side
        assert len(q["options"]) == 4
        assert "id" in q and "q" in q


def test_grade_all_correct_and_wrong():
    d = date(2026, 6, 22)
    _, correct = quiz_bank.grade({}, d)            # correct map for the day
    score, _ = quiz_bank.grade(correct, d)          # answer with the correct keys
    assert score == 5
    wrong = {k: ("a" if v != "a" else "b") for k, v in correct.items()}
    score_w, _ = quiz_bank.grade(wrong, d)
    assert score_w == 0


def test_normalize_domain():
    assert domain_cache.normalize_domain("https://www.AfterNic.com/x?y=1") == "afternic.com"
    assert domain_cache.normalize_domain("bkash.reward.xyz") == "bkash.reward.xyz"
    assert domain_cache.normalize_domain("http://EXAMPLE.com") == "example.com"
    assert domain_cache.normalize_domain("") is None
