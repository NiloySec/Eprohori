"""Persistent per-domain verdict cache + dynamic whitelist/blacklist.

Privacy: stores the HOST only (no path / query string) and is never linked to a
user. Speeds up repeat scans, saves VirusTotal quota, and backs admin allow/deny
lists. Every DB op is defensive — a cache failure must never break validation.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from models import DomainReputation

CACHE_TTL_HOURS = 24 * 7   # automated verdicts go stale after 7 days → re-check


def normalize_domain(url: str) -> str | None:
    if not url:
        return None
    u = url if re.match(r"^https?://", url, re.I) else "http://" + url
    try:
        host = (urlparse(u).hostname or "").lower().strip()
    except Exception:
        return None
    if host.startswith("www."):
        host = host[4:]
    return host or None


def lookup(db: Session, domain: str) -> DomainReputation | None:
    try:
        return db.query(DomainReputation).filter(DomainReputation.domain == domain).first()
    except Exception:
        return None


def is_fresh(rep: DomainReputation) -> bool:
    """Admin listings never expire; automated verdicts honour expires_at."""
    if rep.listed in ("white", "black"):
        return True
    if not rep.expires_at:
        return False
    return datetime.utcnow() < rep.expires_at


def upsert(db: Session, domain: str, verdict: str, source: str, confidence: float,
           ttl_hours: int = CACHE_TTL_HOURS) -> None:
    """Cache/refresh an automated verdict. Never overrides an admin white/black listing."""
    try:
        now = datetime.utcnow()
        exp = now + timedelta(hours=ttl_hours)
        rep = db.query(DomainReputation).filter(DomainReputation.domain == domain).first()
        if rep:
            if rep.listed not in ("white", "black"):
                rep.verdict = verdict
                rep.source = source
                rep.confidence = confidence
                rep.last_checked = now
                rep.expires_at = exp
            rep.hit_count = (rep.hit_count or 0) + 1
        else:
            db.add(DomainReputation(
                domain=domain, verdict=verdict, source=source, confidence=confidence,
                last_checked=now, expires_at=exp, hit_count=1,
            ))
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
