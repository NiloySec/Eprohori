from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from database import Base
from encryption import EncryptedString


class Threat(Base):
    __tablename__ = "threats"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)           # sms | url | facebook | scholarship | investment
    content = Column(Text, nullable=False)
    region = Column(String, nullable=True)
    confidence = Column(Float, default=0.0)
    status = Column(String, default="pending")      # pending | verified | rejected
    up_votes = Column(Integer, default=0)
    reporter_email = Column(String, nullable=True)  # set when reported by a logged-in user
    is_campaign = Column(Integer, default=0)        # 1 = burst of reports detected (scam wave)
    screenshot = Column(Text, nullable=True)        # optional base64 evidence image
    district = Column(String, nullable=True)        # reporter-selected district (region = parent division)
    human_reviewed = Column(Boolean, default=False) # True once an admin manually approved/rejected — safe for ML feedback
    alerted = Column(Boolean, default=False)        # True once a district-wide user alert has been dispatched (corroboration gate)
    created_at = Column(DateTime, server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, default="medium")     # low | medium | high | critical
    created_at = Column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    region = Column(String, nullable=True)
    xp = Column(Integer, default=0)
    badge = Column(String, default="নবীন")         # নবীন | অনুসন্ধানী | রক্ষক | বিশেষজ্ঞ | অভিভাবক
    reports = Column(Integer, default=0)
    validated = Column(Integer, default=0)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(EncryptedString, nullable=True)
    password_hash = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)       # admin accounts (Option B)
    notify_alerts = Column(Boolean, default=True)   # opt-in for district threat email alerts
    district = Column(String, nullable=True)        # user's home district (for targeted alerts)
    totp_secret = Column(String, nullable=True)     # TOTP base32 secret for 2FA (null = 2FA disabled)
    totp_enabled = Column(Boolean, default=False)   # only true after user confirms first 6-digit code
    created_at = Column(DateTime, server_default=func.now())


class Contact(Base):
    """Crowdsourced contact names (Truecaller-style). Stores name-number pairs
    contributed by users to build a local caller ID database."""
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class DomainReputation(Base):
    """Persistent verdict cache per DOMAIN (privacy-safe: host only, no path/query,
    not linked to any user). Speeds up repeat scans, saves VirusTotal quota, and
    backs the dynamic whitelist/blacklist."""
    __tablename__ = "domain_reputation"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(String, unique=True, index=True, nullable=False)  # normalized host
    verdict = Column(String, default="unknown")   # safe | malicious | suspicious | unknown
    source = Column(String, default="")           # virustotal | heuristic | admin | report
    confidence = Column(Float, default=0.0)       # risk score 0-1
    listed = Column(String, nullable=True)        # "white" | "black" | None (admin override)
    hit_count = Column(Integer, default=0)
    last_checked = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)  # cached verdict goes stale after this
    created_at = Column(DateTime, server_default=func.now())


class AdminAudit(Base):
    """Audit trail — who did what, when (multi-admin accountability)."""
    __tablename__ = "admin_audit"

    id = Column(Integer, primary_key=True, index=True)
    admin_email = Column(String, nullable=False)
    action = Column(String, nullable=False)         # approve | reject | broadcast | login
    target = Column(String, nullable=True)          # e.g. "threat #42" or alert title
    ip_address = Column(String, nullable=True)      # for forensics
    created_at = Column(DateTime, server_default=func.now())


class PhoneBlacklist(Base):
    __tablename__ = "phone_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True)


class GlobalStat(Base):
    """Single-row counters for platform-wide stats that need accurate tracking."""
    __tablename__ = "global_stats"

    key = Column(String, primary_key=True)   # e.g. "alerts_sent"
    value = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ImpactFeedback(Base):
    """'Did EProhori save you from a scam?' — the pilot's core impact metric."""
    __tablename__ = "impact_feedback"

    id = Column(Integer, primary_key=True, index=True)
    saved = Column(Boolean, default=False)          # True = "yes, it saved me"
    source = Column(String, nullable=True)          # scan | alert | monitor
    created_at = Column(DateTime, server_default=func.now())
