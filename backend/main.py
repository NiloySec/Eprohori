"""
Eprohori FastAPI backend
Endpoints: /api/stats, /api/threats, /api/alerts, /api/rangers,
           /api/divisions, /api/validate/text, /api/validate/profile,
           /api/check/phone, /api/admin/*
"""

import hashlib
import os
import re
import secrets
import threading
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from typing import Optional

from dotenv import load_dotenv

load_dotenv()  # must run before notification_service reads env keys

import jwt
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlalchemy.orm import Session

import claude_analyzer
import profile_validator
import validator
import phone_checker
from database import Base, engine, get_db
from security import (
    ADMIN_TOKEN_HOURS,
    JWT_ALG,
    JWT_SECRET,
    USER_TOKEN_HOURS,
    _bearer,
    _EMAIL_RE,
    _hash_password,
    _ip_throttle,
    _verify_password,
    create_token,
    get_current_user,
    require_admin,
    throttle,
)
from models import AdminAudit, Alert, ImpactFeedback, PhoneBlacklist, Threat, User
from schemas import (
    ActivityOut,
    AlertOut,
    BroadcastRequest,
    CheckPhoneRequest,
    CheckPhoneResponse,
    DistrictOut,
    DivisionOut,
    QuizResult,
    QuizSubmission,
    RangerOut,
    StatsOut,
    StatusResponse,
    ThreatCreate,
    ThreatOut,
    TrendingScamOut,
    ValidateProfileRequest,
    ValidateProfileResponse,
    ValidateTextRequest,
    ValidateTextResponse,
)
from seed import seed_db
from notification_service import (
    digest_alert_template,
    otp_email_template,
    report_result_email_template,
    send_email,
    send_telegram,
    threat_alert_template,
    user_alert_email_template,
)


async def send_report_result_email(
    to_email: str, name: str, threat_type: str,
    confidence: int, reason: str, district: str,
):
    html = report_result_email_template(name, threat_type, confidence, reason, district)
    result = await send_email(to_email, "Your Report Analysis - Eprohori", html, name)
    print(f"[notify] report-result email -> {to_email}: {result}")


def _bootstrap_admin():
    """Ensure a seed admin account exists, from ADMIN_EMAIL + ADMIN_PASSWORD.
    Promotes the account to is_admin and (re)sets its password each boot so the
    .env is always the source of truth for the primary admin."""
    email = os.getenv("ADMIN_EMAIL", "").lower().strip()
    password = os.getenv("ADMIN_PASSWORD", "")
    if not email or not password:
        return
    from database import SessionLocal
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                name="Eprohori Admin",
                email=email,
                is_admin=True,
                password_hash=_hash_password(password),
                badge="অভিভাবক",
            )
            db.add(user)
            print(f"[main] bootstrapped admin account: {email}")
        else:
            user.is_admin = True
            user.password_hash = _hash_password(password)
            print(f"[main] refreshed admin account: {email}")
        db.commit()
    finally:
        db.close()


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-fix: create any missing tables, seed missing data
    try:
        Base.metadata.create_all(bind=engine)
        # Lightweight migration: idempotently add columns. Works on SQLite + PostgreSQL.
        from sqlalchemy import inspect, text
        insp = inspect(engine)

        def _migrate(table: str, adds: list[tuple[str, str]]):
            existing = {c["name"] for c in insp.get_columns(table)}
            with engine.connect() as conn:
                for col, ddl in adds:
                    if col not in existing:
                        conn.execute(text(ddl))
                        conn.commit()
                        print(f"[main] migrated: {table}.{col}")

        _migrate("users", [
            ("email",         "ALTER TABLE users ADD COLUMN email VARCHAR"),
            ("phone",         "ALTER TABLE users ADD COLUMN phone VARCHAR"),
            ("password_hash", "ALTER TABLE users ADD COLUMN password_hash VARCHAR"),
            ("created_at",    "ALTER TABLE users ADD COLUMN created_at TIMESTAMP"),
            ("is_admin",      "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"),
            ("notify_alerts", "ALTER TABLE users ADD COLUMN notify_alerts BOOLEAN DEFAULT TRUE"),
            ("district",      "ALTER TABLE users ADD COLUMN district VARCHAR"),
            ("totp_secret",   "ALTER TABLE users ADD COLUMN totp_secret VARCHAR"),
            ("totp_enabled",  "ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE"),
        ])
        _migrate("threats", [
            ("reporter_email", "ALTER TABLE threats ADD COLUMN reporter_email VARCHAR"),
            ("is_campaign",    "ALTER TABLE threats ADD COLUMN is_campaign INTEGER DEFAULT 0"),
            ("screenshot",     "ALTER TABLE threats ADD COLUMN screenshot TEXT"),
            ("district",       "ALTER TABLE threats ADD COLUMN district VARCHAR"),
        ])
        seed_db()
        phone_checker.load_blacklist()
        _bootstrap_admin()
    except Exception as exc:  # noqa: BLE001
        print(f"[main] startup auto-fix error: {exc}")
    # Warm ML models in background threads (training can take ~1–2 min)
    threading.Thread(target=validator.preload, daemon=True, name="validator-warm").start()
    threading.Thread(target=profile_validator.preload, daemon=True, name="profile-warm").start()
    # Startup health check
    try:
        from database import SessionLocal
        db = SessionLocal()
        print("[main] -- startup health check --")
        print(f"[main]   threats: {db.query(Threat).count()}")
        print(f"[main]   alerts:  {db.query(Alert).count()}")
        print(f"[main]   users:   {db.query(User).count()}")
        print(f"[main]   phones:  {db.query(PhoneBlacklist).count()}")
        db.close()
    except Exception as exc:  # noqa: BLE001
        print(f"[main] health check failed: {exc}")
    print("[main] Eprohori API ready")
    yield
    # (shutdown: nothing to clean up)


# ── App ────────────────────────────────────────────────────────────────────────

_is_production = os.getenv("ENV", "development").lower() == "production"

_sentry_dsn = os.getenv("SENTRY_DSN", "").strip()
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment="production" if _is_production else "development",
        traces_sample_rate=0.1 if _is_production else 1.0,
        send_default_pii=False,
        integrations=[FastApiIntegration()],
    )

app = FastAPI(
    title="Eprohori API",
    description="Bangladesh's crowdsourced cyber-threat platform",
    version="1.0.0",
    lifespan=lifespan,
    # Docs always disabled — they advertise the full attack surface
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# ── CORS: restrict to known frontend origins ─────────────────────────────────
# Set ALLOWED_ORIGINS in .env as a comma-separated list for production
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# Security headers — protect every response from common browser attacks
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: StarletteResponse = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ── Request-body size cap (protect ML pipeline from DoS) ─────────────────────
MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", str(64 * 1024)))  # 64 KB default


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large (max {MAX_BODY_BYTES} bytes)"},
            )
        return await call_next(request)


app.add_middleware(BodySizeLimitMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    """Catch-all: log the error, return a clean 500 instead of a stack trace."""
    print(f"[main] ERROR {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": request.url.path},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/feedback/saved", tags=["marketing"])
def impact_feedback(request: dict, req: Request, db: Session = Depends(get_db)):
    """Record a 'did Eprohori save you from a scam?' response — the pilot impact metric."""
    throttle(req, "impact-feedback", max_hits=20, window_sec=300)
    saved = bool(request.get("saved"))
    source = (request.get("source") or "").strip()[:20] or None
    db.add(ImpactFeedback(saved=saved, source=source))
    db.commit()
    saved_total = db.query(func.count(ImpactFeedback.id)).filter(ImpactFeedback.saved == True).scalar() or 0  # noqa: E712
    return {"success": True, "saved_count": saved_total}


@app.get("/api/stats", response_model=StatsOut, tags=["stats"])
def get_stats(db: Session = Depends(get_db)):
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_count = (
        db.query(func.count(Threat.id))
        .filter(Threat.created_at >= today_start)
        .scalar()
        or 0
    )
    total = db.query(Threat).count()
    active = db.query(Threat).filter(Threat.status == "verified").count()
    rangers = db.query(User).count()
    saved_count = db.query(func.count(ImpactFeedback.id)).filter(ImpactFeedback.saved == True).scalar() or 0  # noqa: E712
    return StatsOut(
        total_threats=total,
        today_reports=today_count,
        active_threats=active,
        alerted_people=total * 27,
        district_coverage=64,
        rangers_count=rangers,
        pending_count=db.query(Threat).filter(Threat.status == "pending").count(),
        total_reports=total,
        warned_count=total * 27,
        rangers=rangers,
        districts_covered=64,
        saved_count=saved_count,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Threats
# ─────────────────────────────────────────────────────────────────────────────

def _timeframe_cutoff(timeframe: Optional[str]) -> Optional[datetime]:
    """Return a UTC cutoff datetime for the given timeframe string, or None."""
    if timeframe == "24h":
        return datetime.utcnow() - timedelta(hours=24)
    if timeframe == "7d":
        return datetime.utcnow() - timedelta(days=7)
    if timeframe == "30d":
        return datetime.utcnow() - timedelta(days=30)
    return None


def _is_admin_token(creds: Optional[HTTPAuthorizationCredentials]) -> bool:
    if not creds:
        return False
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("role") == "admin"
    except jwt.InvalidTokenError:
        return False


@app.get("/api/threats", response_model=list[ThreatOut], tags=["threats"])
def list_threats(
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    timeframe: Optional[str] = Query(None),
    include_pending: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    # Non-verified data is admin-only: a valid admin JWT is required to see it
    wants_private = include_pending or (status and status != "verified")
    if wants_private and not _is_admin_token(creds):
        raise HTTPException(403, "Admin access required to view unverified reports")

    q = db.query(Threat)
    if status:
        q = q.filter(Threat.status == status)
    elif not include_pending:
        # Public default: only verified threats are visible
        q = q.filter(Threat.status == "verified")
    if type:
        q = q.filter(Threat.type == type)
    if search:
        q = q.filter(Threat.content.ilike(f"%{search}%"))
    cutoff = _timeframe_cutoff(timeframe)
    if cutoff:
        q = q.filter(Threat.created_at >= cutoff)
    return q.order_by(Threat.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/threats/trending", response_model=list[TrendingScamOut], tags=["threats"])
def get_trending(db: Session = Depends(get_db)):
    """Top 3 threat types of the last 7 days, with share percentage."""
    week_ago = datetime.utcnow() - timedelta(days=7)
    base = db.query(Threat).filter(Threat.created_at >= week_ago)
    # Fall back to all-time if the last week is empty (fresh/demo DB)
    if base.count() == 0:
        base = db.query(Threat)
        week_ago = None

    q = db.query(
        Threat.type,
        func.count(Threat.id).label("cnt"),
        func.max(Threat.content).label("example"),
        func.max(Threat.region).label("region"),
    )
    if week_ago:
        q = q.filter(Threat.created_at >= week_ago)
    rows = (
        q.group_by(Threat.type)
        .order_by(func.count(Threat.id).desc())
        .limit(3)
        .all()
    )
    total = sum(r.cnt for r in rows) or 1
    colors = ["#ff4444", "#f59e0b", "#00e5c4"]
    return [
        TrendingScamOut(
            rank=i + 1,
            type=r.type,
            count=r.cnt,
            example=(r.example[:120] if r.example else ""),
            color=colors[i],
            percentage=round(r.cnt * 100 / total),
            division=r.region,
        )
        for i, r in enumerate(rows)
    ]


def _severity_from_confidence(confidence: float) -> str:
    pct = confidence * 100 if confidence <= 1 else confidence
    if pct >= 85:
        return "critical"
    if pct >= 70:
        return "high"
    if pct >= 50:
        return "medium"
    return "low"


@app.get("/api/activity", response_model=list[ActivityOut], tags=["threats"])
def get_activity(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Latest threats for the live activity feed, newest first."""
    rows = (
        db.query(Threat)
        .filter(Threat.status == "verified")  # public feed: verified only
        .order_by(Threat.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        ActivityOut(
            id=r.id,
            type=r.type,
            detail=(r.content or "")[:50],
            division=r.district or r.region,
            severity=_severity_from_confidence(r.confidence or 0),
            status=r.status,
            created_at=r.created_at,
        )
        for r in rows
    ]


@app.get("/api/threats/my-reports", response_model=list[ThreatOut], tags=["threats"])
def my_reports(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Caller's own reports — identity comes from JWT, never from query string."""
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    email = (payload.get("sub") or "").lower().strip()
    return (
        db.query(Threat)
        .filter(Threat.reporter_email == email)
        .order_by(Threat.created_at.desc())
        .limit(100)
        .all()
    )


@app.get("/api/threats/{threat_id}", response_model=ThreatOut, tags=["threats"])
def get_threat(
    threat_id: int,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    t = db.query(Threat).filter(Threat.id == threat_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Threat not found")
    # Public can only see verified threats
    if t.status == "verified":
        return t
    # Unverified: viewer must prove they are the reporter (or admin) via JWT
    viewer_email: Optional[str] = None
    is_admin_viewer = False
    if creds:
        try:
            payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
            viewer_email = (payload.get("sub") or "").lower().strip()
            is_admin_viewer = payload.get("role") == "admin"
        except jwt.InvalidTokenError:
            pass
    if is_admin_viewer:
        return t
    if viewer_email and viewer_email == (t.reporter_email or "").lower():
        return t
    raise HTTPException(status_code=403, detail="Not authorized to view this report")


# ── Alert rate-limiting: max 1 alert email per hour, rest go into a digest ──
ALERT_EMAIL_COOLDOWN_SEC = 3600
_alert_buffer: list[dict] = []
_last_alert_email_ts: float = 0.0


async def send_threat_alert(
    threat_type: str,
    division: str,
    detail: str,
    severity: str,
    confidence: int,
):
    """Email the admin + Telegram for critical/high threats — rate-capped.

    First alert in an hour goes out immediately; further alerts within the
    cooldown window are buffered and sent as ONE digest email. 5000 threats
    never mean 5000 emails."""
    global _last_alert_email_ts

    _alert_buffer.append({
        "type": threat_type,
        "division": division,
        "detail": detail,
        "severity": severity,
        "confidence": confidence,
    })

    now = datetime.utcnow().timestamp()
    if now - _last_alert_email_ts < ALERT_EMAIL_COOLDOWN_SEC:
        print(f"[notify] alert buffered for digest ({len(_alert_buffer)} pending, cooldown active)")
        return

    _last_alert_email_ts = now
    items = _alert_buffer[:]
    _alert_buffer.clear()

    admin_email = os.getenv("ADMIN_EMAIL", "eprohoribd@gmail.com")

    if len(items) == 1:
        i = items[0]
        html = threat_alert_template(
            threat_type=i["type"],
            division=i["division"] or "Unknown",
            detail=i["detail"],
            severity=i["severity"],
            confidence=i["confidence"],
        )
        subject = f"🚨 {i['severity'].upper()} Threat in {i['division'] or 'Bangladesh'}"
    else:
        html = digest_alert_template(items)
        subject = f"🛡️ Eprohori Digest — {len(items)} new threats this hour"

    if admin_email:
        result = await send_email(admin_email, subject, html)
        print(f"[notify] threat alert email ({len(items)} item(s)) -> {admin_email}: {result}")

    if len(items) == 1:
        i = items[0]
        telegram_msg = f"""
🚨 <b>Eprohori Alert</b>

<b>Severity:</b> {i['severity'].upper()}
<b>Type:</b> {i['type']}
<b>Division:</b> {i['division'] or 'Unknown'}
<b>AI Confidence:</b> {i['confidence']}%
<b>Detail:</b> {i['detail'][:80]}...

🔗 eprohori.vercel.app/monitor
"""
    else:
        lines = "\n".join(
            f"• [{i['severity'].upper()}] {i['type']} — {i['detail'][:50]}…" for i in items[:8]
        )
        telegram_msg = f"""
🛡️ <b>Eprohori Digest</b> — {len(items)} new threats this hour

{lines}

🔗 eprohori.vercel.app/monitor
"""
    await send_telegram(telegram_msg)


# ── Report clustering + AI triage ────────────────────────────────────────────

# Known-legitimate domains: reports against these never auto-verify, no matter
# how many come in (brigading defense — they go to the manual scrutiny queue).
WHITELIST_DOMAINS = (
    "bkash.com", "nagad.com.bd", "rocket.com.bd", "upay.com.bd",
    "gov.bd", "bb.org.bd", "cirt.gov.bd", "btrc.gov.bd",
    "dutchbanglabank.com", "bracbank.com", "islamibankbd.com", "sonalibank.com.bd",
    "google.com", "facebook.com", "youtube.com",
)

# AI triage thresholds (confidence is 0.0–1.0) — tunable via .env, no code change
#   AUTO_VERIFY_CONF : at/above this → auto-verified (base bar; trust scoring may raise it)
#   AUTO_REJECT_CONF : below this → auto-rejected; in between → admin queue
AUTO_VERIFY_CONF = float(os.getenv("AUTO_VERIFY_CONF", "0.90"))
AUTO_REJECT_CONF = float(os.getenv("AUTO_REJECT_CONF", "0.35"))

# ── User alert thresholds (System 2 — independent from triage) ───────────────
ALERT_CRITICAL_MIN = 0.90   # 90-100% → instant email on auto-verify
ALERT_HIGH_MIN     = 0.70   # 70-89%  → email after admin verification


def get_severity(confidence: float) -> str:
    """Single source of truth for severity labels."""
    if confidence >= 0.90: return "critical"
    if confidence >= 0.70: return "high"
    if confidence >= 0.55: return "medium"
    if confidence >= 0.35: return "low"
    return "safe"


# Per-threat per-recipient dedup so re-verifying the same threat doesn't re-spam
sent_alerts_cache: set[str] = set()


async def send_alert_emails(threat_id: int) -> int:
    """Email the reporter + opt-in users in the affected district.
    Returns the number of emails actually sent."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        t = db.query(Threat).filter(Threat.id == threat_id).first()
        if not t:
            return 0

        confidence = (t.confidence or 0)
        if confidence > 1:
            confidence = confidence / 100
        if confidence < ALERT_HIGH_MIN:
            return 0  # below alert threshold — nothing to do

        severity = get_severity(confidence)
        district = t.district or t.region or ""

        # ── Build recipient set ──
        recipients: dict[str, str] = {}  # email -> name

        # NOTE: the reporter is intentionally NOT alerted here — they already know
        # about the threat they reported. They get a separate result/confirmation
        # email instead. This alert is a *warning* for OTHER people in the district.

        # Opt-in users whose district OR region matches (excluding the reporter)
        if district:
            district_users = db.query(User).filter(
                User.notify_alerts == True,  # noqa: E712
                User.email.isnot(None),
                ((User.district == district) | (User.region == district)),
            ).all()
            for u in district_users:
                if u.email and u.email != t.reporter_email:
                    recipients.setdefault(u.email, u.name)

        if not recipients:
            return 0

        icon = "🚨" if severity == "critical" else "⚠️"
        subject = f"{icon} {severity.upper()} Threat Alert in {district or 'Bangladesh'}"
        html = user_alert_email_template(
            threat_type=t.type,
            district=district,
            detail=(t.content or "")[:200],
            confidence=int(confidence * 100),
            severity=severity,
            threat_id=t.id,
        )

        sent = 0
        for email, name in recipients.items():
            alert_key = f"{t.id}_{email}"
            if alert_key in sent_alerts_cache:
                continue
            sent_alerts_cache.add(alert_key)
            try:
                result = await send_email(email, subject, html, name)
                if result.get("success"):
                    sent += 1
            except Exception as e:  # noqa: BLE001
                print(f"[alert] failed {email}: {e}")
        print(f"[alert] {severity} -> {sent}/{len(recipients)} sent for threat #{t.id}")
        return sent
    finally:
        db.close()


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _extract_domain(text: str) -> Optional[str]:
    m = re.search(r"(?:https?://)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)", text.lower())
    return m.group(1) if m else None


def _is_whitelisted(content: str) -> bool:
    domain = _extract_domain(content or "")
    if not domain:
        return False
    return any(domain == w or domain.endswith("." + w) for w in WHITELIST_DOMAINS)


def _find_duplicate(db: Session, type_: str, content: str) -> Optional[Threat]:
    """Same scam reported again? Exact text, same URL domain, same phone
    number, or >=85% text similarity against recent reports of the same type."""
    norm = _normalize_text(content)
    if not norm:
        return None
    domain = _extract_domain(norm)
    digits = re.sub(r"\D", "", norm)

    recent = (
        db.query(Threat)
        .filter(Threat.type == type_, Threat.status != "rejected")
        .order_by(Threat.created_at.desc())
        .limit(200)
        .all()
    )
    for t in recent:
        tnorm = _normalize_text(t.content or "")
        if tnorm == norm:
            return t
        if domain and _extract_domain(tnorm) == domain:
            return t
        if len(digits) >= 11 and digits == re.sub(r"\D", "", tnorm):
            return t
        if len(norm) >= 20 and len(tnorm) >= 20 and SequenceMatcher(None, norm, tnorm).ratio() >= 0.85:
            return t
    return None


# ── Rate limiting: max 5 reports / 10 min per source (anti-brigading) ────────
RATE_LIMIT_WINDOW_SEC = 600
RATE_LIMIT_MAX = 5
_report_rate: dict[str, list[float]] = {}

# ── Campaign (burst) detection: 5+ reports of one cluster within an hour ─────
CAMPAIGN_WINDOW_SEC = 3600
CAMPAIGN_THRESHOLD = 5
_recent_reports: dict[int, list[float]] = {}   # threat_id -> report timestamps
_campaign_alerted: dict[int, float] = {}        # threat_id -> last wave-alert ts

# R3: if one entity (cluster) gets more than this many reports in a day, push it
# back to admin review (anti-brigading — stops mass false reports auto-verifying).
DAILY_REVIEW_THRESHOLD = 5
_daily_entity_count: dict[int, list[float]] = {}  # threat_id -> today's report timestamps


async def send_campaign_alert(threat_type: str, division: str, detail: str, report_count: int):
    """Scam wave: bypasses the hourly cooldown — people are being hit RIGHT NOW."""
    html = threat_alert_template(
        threat_type=threat_type,
        division=division or "Unknown",
        detail=detail,
        severity="critical",
        confidence=99,
    )
    subject = f"⚡ SCAM WAVE — {report_count} reports in 1 hour ({division or 'Bangladesh'})"
    admin_email = os.getenv("ADMIN_EMAIL", "eprohoribd@gmail.com")
    if admin_email:
        result = await send_email(admin_email, subject, html)
        print(f"[notify] CAMPAIGN alert -> {admin_email}: {result}")
    await send_telegram(
        f"⚡ <b>SCAM WAVE DETECTED</b>\n\n{report_count} reports in the last hour\n"
        f"<b>Type:</b> {threat_type}\n<b>Division:</b> {division or 'Unknown'}\n"
        f"<b>Detail:</b> {detail[:80]}...\n\n🔗 eprohori.vercel.app/monitor"
    )


def _reporter_trust(db: Session, creds: Optional[HTTPAuthorizationCredentials]) -> tuple[Optional[str], float, bool]:
    """Trust scoring: who is reporting decides how much the report weighs.

    Returns (reporter_email, auto_verify_threshold, force_pending).

    Single threshold for everyone: AUTO_VERIFY_CONF (0.90 = "critical"), so any
    critical-confidence threat auto-verifies + alerts instantly, consistently.
    Abuse protection is kept (not a trust *tier*, but hard guards):
      - repeat offender (3+ rejected, more rejected than verified) → manual review
      - whitelisted domains never auto-verify (see _is_whitelisted)
    """
    if not creds:
        return None, AUTO_VERIFY_CONF, False
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        return None, AUTO_VERIFY_CONF, False
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None, AUTO_VERIFY_CONF, False

    rejected = db.query(Threat).filter(
        Threat.reporter_email == email, Threat.status == "rejected"
    ).count()
    verified = db.query(Threat).filter(
        Threat.reporter_email == email, Threat.status == "verified"
    ).count()
    if rejected >= 3 and rejected > verified:
        return email, 1.01, True  # repeat offender → human always decides
    return email, AUTO_VERIFY_CONF, False


MAX_THREAT_CONTENT_LEN = 4000   # 4 KB of text — enough for SMS/URL/short post


@app.post("/api/threats", response_model=ThreatOut, status_code=201, tags=["threats"])
def create_threat(
    payload: ThreatCreate,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    # Use canonical or alias field names — pull normalised values
    _content = payload.normalized_content()
    _type = payload.normalized_type()
    _description = payload.description or ""
    payload.content = _content
    payload.type = _type

    # ── Validate required fields ─────────────────────────────────────────────
    valid_types = {
        "sms", "email", "messenger", "whatsapp", "telegram", "website", "other",
        # legacy/internal types still accepted for back-compat
        "url", "facebook", "call", "scholarship", "investment",
    }
    if _type and _type not in valid_types:
        raise HTTPException(422, f"Invalid threat type. Allowed: {sorted(valid_types)}")
    if payload.district:
        # Recognised districts come from the district endpoint's coverage
        recognised = {d[0] for d in DISTRICTS}
        if payload.district not in recognised:
            raise HTTPException(422, f"Invalid district: {payload.district}")

    # ── Content size cap: protect the ML pipeline from DoS ──────────────────
    if len(_content) > MAX_THREAT_CONTENT_LEN:
        raise HTTPException(413, f"Content too long (max {MAX_THREAT_CONTENT_LEN} characters)")
    if len(_description) > MAX_THREAT_CONTENT_LEN:
        raise HTTPException(413, f"Description too long (max {MAX_THREAT_CONTENT_LEN} characters)")
    if len(_content) + len(_description) > MAX_THREAT_CONTENT_LEN:
        raise HTTPException(413, f"Total text too long (max {MAX_THREAT_CONTENT_LEN} characters combined)")

    now_ts = datetime.utcnow().timestamp()

    # ── 0. Rate limit: same source can't flood reports ────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    hits = [ts for ts in _report_rate.get(client_ip, []) if now_ts - ts < RATE_LIMIT_WINDOW_SEC]
    if len(hits) >= RATE_LIMIT_MAX:
        raise HTTPException(429, "Too many reports from this source — please try again in a few minutes")
    hits.append(now_ts)
    _report_rate[client_ip] = hits

    # ── 1. Deduplication: 5000 reports of one scam = ONE threat ──────────────
    dup = _find_duplicate(db, payload.type, payload.content)
    if dup:
        dup.up_votes = (dup.up_votes or 0) + 1  # report count grows → credibility

        # Campaign detection: burst of reports on one cluster = active scam wave
        times = [ts for ts in _recent_reports.get(dup.id, []) if now_ts - ts < CAMPAIGN_WINDOW_SEC]
        times.append(now_ts)
        _recent_reports[dup.id] = times
        if len(times) + 1 >= CAMPAIGN_THRESHOLD:  # +1 = the original report
            dup.is_campaign = 1
            last_wave = _campaign_alerted.get(dup.id, 0)
            if dup.status == "verified" and now_ts - last_wave > CAMPAIGN_WINDOW_SEC:
                _campaign_alerted[dup.id] = now_ts
                background_tasks.add_task(
                    send_campaign_alert, dup.type, dup.region or "", dup.content or "", len(times) + 1
                )

        # R3: >5 reports/day on the same entity → force admin review
        day_times = [ts for ts in _daily_entity_count.get(dup.id, []) if now_ts - ts < 86400]
        day_times.append(now_ts)
        _daily_entity_count[dup.id] = day_times
        if len(day_times) > DAILY_REVIEW_THRESHOLD and dup.status == "verified":
            dup.status = "pending"  # over-reported → human scrutiny

        db.commit()
        db.refresh(dup)
        response.status_code = 200  # clustered into existing threat
        return dup

    # ── 2. Trust scoring: reporter history sets the auto-verify bar ──────────
    reporter_email, verify_threshold, force_pending = _reporter_trust(db, creds)

    # Anonymous reporters must supply an email so we can confirm the result to them.
    if not reporter_email:
        anon_email = (payload.reporter_email or "").lower().strip()
        if not _EMAIL_RE.match(anon_email):
            raise HTTPException(400, "Anonymous রিপোর্টের জন্য একটি ইমেইল দিন — ফলাফল জানাতে প্রয়োজন।")
        reporter_email = anon_email

    # ── 3. ML analysis ────────────────────────────────────────────────────────
    # All text-bearing channels (sms/email/messenger/whatsapp/telegram/website/url)
    # run through the text classifier — it operates on raw text regardless of source.
    confidence = 0.0
    ml_analyzed = False
    if payload.content:
        try:
            result = validator.predict(payload.content)
            confidence = result["confidence"]
            ml_analyzed = True
        except Exception:
            pass

    # ── 4. AI triage: auto-verify / auto-reject / admin queue ────────────────
    # Whitelisted (legit) domains never auto-verify — manual scrutiny only.
    if force_pending or _is_whitelisted(payload.content):
        status = "pending"
    elif ml_analyzed and confidence >= verify_threshold:
        status = "verified"
    elif ml_analyzed and confidence < AUTO_REJECT_CONF:
        status = "rejected"
    else:
        status = "pending"  # uncertain or not ML-analyzable → human decides

    t = Threat(
        type=payload.type,
        content=payload.content,
        region=payload.region,
        confidence=confidence or payload.confidence or 0.0,
        status=status,
        up_votes=0,
        reporter_email=reporter_email or (payload.reporter_email or "").lower().strip() or None,
        is_campaign=0,
        screenshot=payload.screenshot,
        district=payload.district,
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    # ── 5. Alerts ────────────────────────────────────────────────────────────
    confidence_norm = (t.confidence or 0)
    if confidence_norm > 1:
        confidence_norm = confidence_norm / 100

    if t.status == "verified":
        # 5a. Admin / Telegram heads-up (existing flow)
        severity = get_severity(confidence_norm)
        conf_pct = int(confidence_norm * 100)
        if severity in ("critical", "high"):
            background_tasks.add_task(
                send_threat_alert, t.type, t.region or "", t.content or "", severity, conf_pct
            )

        # 5b. NEW: District-wide user emails for 70%+ auto-verified threats
        if confidence_norm >= ALERT_HIGH_MIN:
            background_tasks.add_task(send_alert_emails, t.id)

        # 5c. Reporter result email (existing)
        if t.reporter_email and severity in ("critical", "high"):
            reporter = db.query(User).filter(User.email == t.reporter_email).first()
            background_tasks.add_task(
                send_report_result_email,
                t.reporter_email,
                reporter.name if reporter else t.reporter_email.split("@")[0],
                t.type,
                conf_pct,
                "AI বিশ্লেষণে এটি সত্যিকারের হুমকি হিসেবে নিশ্চিত হয়েছে।",
                t.district or t.region or "",
            )

    return t


@app.put("/api/threats/{threat_id}/vote", tags=["threats"])
def vote_threat(
    threat_id: int,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Authenticated upvote — prevents anonymous credibility inflation."""
    if not creds:
        raise HTTPException(401, "Login required to vote")
    try:
        jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    t = db.query(Threat).filter(Threat.id == threat_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Threat not found")
    t.up_votes = (t.up_votes or 0) + 1
    db.commit()
    return {"up_votes": t.up_votes}


# ─────────────────────────────────────────────────────────────────────────────
# Alerts
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/alerts", response_model=list[AlertOut], tags=["alerts"])
def list_alerts(
    severity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Alert)
    if severity:
        q = q.filter(Alert.severity == severity)
    return q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()


# ─────────────────────────────────────────────────────────────────────────────
# Rangers / Leaderboard
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/rangers", response_model=list[RangerOut], tags=["rangers"])
def list_rangers(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Top users ordered by XP, with 1-based rank numbers."""
    users = (
        db.query(User)
        .order_by(User.xp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    out = []
    for i, u in enumerate(users):
        r = RangerOut.model_validate(u)
        r.rank = skip + i + 1
        out.append(r)
    return out


@app.post("/api/rangers/quiz", response_model=QuizResult, tags=["rangers"])
def submit_quiz(payload: QuizSubmission):
    """
    3-question quiz. Correct answers are fixed for the demo.
    q1: What is phishing?  → b
    q2: Safe URL starts with? → a
    q3: OTP should be shared with? → c (nobody)
    """
    correct = {"q1": "b", "q2": "a", "q3": "c"}
    score = sum(1 for k, v in correct.items() if payload.answers.get(k) == v)
    passed = score >= 2
    return QuizResult(
        passed=passed,
        score=score,
        total=3,
        xp_earned=score * 50,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Division heatmap
# ─────────────────────────────────────────────────────────────────────────────

DIVISIONS = [
    "Dhaka", "Chittagong", "Sylhet", "Rajshahi",
    "Khulna", "Barishal", "Mymensingh", "Rangpur",
]


@app.get("/api/divisions", response_model=list[DivisionOut], tags=["heatmap"])
def get_divisions(
    timeframe: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    cutoff = _timeframe_cutoff(timeframe)
    result = []
    for div in DIVISIONS:
        q = db.query(func.count(Threat.id)).filter(
            Threat.region == div, Threat.status == "verified"
        )
        if cutoff:
            q = q.filter(Threat.created_at >= cutoff)
        if type:
            q = q.filter(Threat.type == type)
        count = q.scalar() or 0
        color = "#ff4444" if count > 30 else ("#f59e0b" if count > 10 else "#22c55e")
        result.append(DivisionOut(name=div, threats=count, color=color))
    return result


# 20 key districts: (name, name_bn, division, lat, lng, weight-within-division)
DISTRICTS = [
    ("Dhaka",        "ঢাকা",         "Dhaka",      23.8103, 90.4125, 0.45),
    ("Gazipur",      "গাজীপুর",       "Dhaka",      24.0023, 90.4264, 0.25),
    ("Narayanganj",  "নারায়ণগঞ্জ",   "Dhaka",      23.6238, 90.5000, 0.20),
    ("Tangail",      "টাঙ্গাইল",      "Dhaka",      24.2513, 89.9167, 0.10),
    ("Chattogram",   "চট্টগ্রাম",     "Chittagong", 22.3569, 91.7832, 0.50),
    ("Cumilla",      "কুমিল্লা",      "Chittagong", 23.4607, 91.1809, 0.25),
    ("Cox's Bazar",  "কক্সবাজার",     "Chittagong", 21.4272, 92.0058, 0.15),
    ("Noakhali",     "নোয়াখালী",     "Chittagong", 22.8696, 91.0995, 0.10),
    ("Sylhet",       "সিলেট",         "Sylhet",     24.8949, 91.8687, 0.65),
    ("Moulvibazar",  "মৌলভীবাজার",   "Sylhet",     24.4829, 91.7774, 0.35),
    ("Rajshahi",     "রাজশাহী",       "Rajshahi",   24.3745, 88.6042, 0.50),
    ("Bogura",       "বগুড়া",         "Rajshahi",   24.8466, 89.3773, 0.30),
    ("Pabna",        "পাবনা",         "Rajshahi",   24.0064, 89.2372, 0.20),
    ("Khulna",       "খুলনা",         "Khulna",     22.8456, 89.5403, 0.55),
    ("Jashore",      "যশোর",          "Khulna",     23.1664, 89.2081, 0.45),
    ("Barishal",     "বরিশাল",        "Barishal",   22.7010, 90.3535, 0.70),
    ("Patuakhali",   "পটুয়াখালী",    "Barishal",   22.3596, 90.3296, 0.30),
    ("Mymensingh",   "ময়মনসিংহ",     "Mymensingh", 24.7471, 90.4203, 1.00),
    ("Rangpur",      "রংপুর",         "Rangpur",    25.7439, 89.2752, 0.60),
    ("Dinajpur",     "দিনাজপুর",      "Rangpur",    25.6217, 88.6354, 0.40),
]


@app.get("/api/districts", response_model=list[DistrictOut], tags=["heatmap"])
def get_districts(
    timeframe: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """20 key districts. Counts are the division totals distributed by
    population/activity weight (threats are reported at division level)."""
    cutoff = _timeframe_cutoff(timeframe)
    div_counts: dict[str, int] = {}
    for div in DIVISIONS:
        q = db.query(func.count(Threat.id)).filter(
            Threat.region == div, Threat.status == "verified"
        )
        if cutoff:
            q = q.filter(Threat.created_at >= cutoff)
        if type:
            q = q.filter(Threat.type == type)
        div_counts[div] = q.scalar() or 0

    result = []
    for name, name_bn, division, lat, lng, weight in DISTRICTS:
        count = round(div_counts.get(division, 0) * weight)
        color = "#ff4444" if count > 15 else ("#f59e0b" if count > 5 else "#22c55e")
        result.append(DistrictOut(
            name=name, name_bn=name_bn, division=division,
            lat=lat, lng=lng, threats=count, color=color,
        ))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Auth / OTP  (emails via Resend -> Brevo fallback)
# ─────────────────────────────────────────────────────────────────────────────

# Store OTPs temporarily (in production use Redis)
otp_store: dict[str, dict] = {}

def _log_audit(db: Session, admin_email: str, action: str, target: str = "") -> None:
    db.add(AdminAudit(admin_email=admin_email, action=action, target=target))
    db.commit()


@app.post("/api/admin/login", tags=["auth"])
def admin_login_alias(request: dict, req: Request, db: Session = Depends(get_db)):
    """Back-compat alias: accepts {password} (uses ADMIN_EMAIL) or {email, password}."""
    if "email" not in request:
        request["email"] = os.getenv("ADMIN_EMAIL", "")
    return admin_login(request, req, db)


@app.post("/api/auth/admin-login", tags=["auth"])
def admin_login(request: dict, req: Request, db: Session = Depends(get_db)):
    """Account-based admin login: email + password, must have is_admin = True."""
    # 5 attempts per IP per 10 minutes — admin login is high-value
    throttle(req, "admin-login", max_hits=5, window_sec=600)

    email = (request.get("email") or "").lower().strip()
    password = request.get("password") or ""

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not _verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid admin credentials")
    if not user.is_admin:
        raise HTTPException(403, "This account does not have admin access")

    _log_audit(db, email, "login", "admin panel")
    return {
        "token": create_token(email, "admin", ADMIN_TOKEN_HOURS),
        "expires_hours": ADMIN_TOKEN_HOURS,
        "name": user.name,
        "email": email,
    }


@app.post("/api/auth/refresh", tags=["auth"])
def refresh_token(payload: dict = Depends(get_current_user)):
    """Sliding renewal: a valid token can be exchanged for a fresh one."""
    role = payload.get("role", "user")
    hours = ADMIN_TOKEN_HOURS if role == "admin" else USER_TOKEN_HOURS
    return {"token": create_token(payload["sub"], role, hours)}


def _user_rank(db: Session, user: User) -> int:
    return db.query(User).filter(User.xp > (user.xp or 0)).count() + 1


def _user_payload(db: Session, user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_admin": bool(user.is_admin),
        "phone": user.phone or "",
        "division": user.region or "",
        "district": user.district or "",
        "notify_alerts": bool(user.notify_alerts) if user.notify_alerts is not None else True,
        "xp": user.xp or 0,
        "reports": user.reports or 0,
        "badge": user.badge,
        "rank": _user_rank(db, user),
        "joinedAt": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat(),
    }


@app.post("/api/auth/register", status_code=201, tags=["auth"])
def register_user(request: dict, db: Session = Depends(get_db)):
    name = (request.get("name") or "").strip()
    email = (request.get("email") or "").lower().strip()
    phone = (request.get("phone") or "").strip()
    division = (request.get("division") or "").strip()
    password = request.get("password") or ""

    if len(name) < 2:
        raise HTTPException(400, "Name required")
    if "@" not in email:
        raise HTTPException(400, "Valid email required")
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists")

    user = User(
        name=name,
        email=email,
        phone=phone,
        region=division,
        xp=0,
        reports=0,
        validated=0,
        badge="নবীন",
        password_hash=_hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        **_user_payload(db, user),
        "token": create_token(user.email, "user", USER_TOKEN_HOURS),
    }


@app.post("/api/auth/login", tags=["auth"])
def login_user(request: dict, req: Request, db: Session = Depends(get_db)):
    throttle(req, "user-login", max_hits=10, window_sec=300)

    email = (request.get("email") or "").lower().strip()
    password = request.get("password") or ""

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not _verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    # 2FA enforcement — if user has TOTP enabled, require valid 6-digit code
    if user.totp_enabled and user.totp_secret:
        otp = (request.get("totp_code") or "").strip()
        if not otp:
            return {"requires_2fa": True, "email": user.email}
        import pyotp
        if not pyotp.TOTP(user.totp_secret).verify(otp, valid_window=1):
            raise HTTPException(401, "Invalid 2FA code")

    return {
        **_user_payload(db, user),
        "token": create_token(user.email, "user", USER_TOKEN_HOURS),
    }


@app.post("/api/auth/2fa/setup", tags=["auth"])
def setup_2fa(payload: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate a TOTP secret + QR provisioning URI. User must call /verify to activate."""
    import pyotp
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.totp_enabled:
        raise HTTPException(400, "2FA already enabled. Disable first to regenerate.")

    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Eprohori")
    return {"secret": secret, "provisioning_uri": uri}


@app.post("/api/auth/2fa/verify", tags=["auth"])
def verify_2fa(request: dict, payload: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Confirm 2FA setup by submitting first 6-digit code from authenticator app."""
    import pyotp
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user or not user.totp_secret:
        raise HTTPException(400, "2FA not initialized — call /setup first")

    code = (request.get("code") or "").strip()
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(401, "Invalid code")

    user.totp_enabled = True
    db.commit()
    return {"success": True, "message": "2FA activated"}


@app.post("/api/auth/2fa/disable", tags=["auth"])
def disable_2fa(request: dict, payload: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Disable 2FA — requires current TOTP code as confirmation."""
    import pyotp
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(400, "2FA not enabled")

    code = (request.get("code") or "").strip()
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(401, "Invalid code")

    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"success": True, "message": "2FA disabled"}


@app.put("/api/auth/profile", tags=["auth"])
def update_profile(
    request: dict,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Identity comes from the verified JWT, never from the request body
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(404, "User not found")

    if request.get("name"):
        user.name = request["name"].strip()
    if request.get("phone") is not None:
        user.phone = request["phone"].strip()
    if request.get("division"):
        user.region = request["division"].strip()
    db.commit()
    db.refresh(user)
    return _user_payload(db, user)


@app.patch("/api/users/preferences", tags=["auth"])
def update_preferences(
    request: dict,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle the notify_alerts opt-in (and optionally update home district)."""
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(404, "User not found")

    if "notify_alerts" in request:
        user.notify_alerts = bool(request["notify_alerts"])
    if "district" in request:
        user.district = (request["district"] or "").strip() or None

    db.commit()
    db.refresh(user)
    return {
        "notify_alerts": bool(user.notify_alerts),
        "district": user.district,
    }


@app.delete("/api/users/me", tags=["auth"])
def delete_account(
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete the authenticated user's account."""
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if user:
        db.delete(user)
        db.commit()
    return {"success": True, "message": "Account deleted"}


@app.post("/api/auth/change-password", tags=["auth"])
def change_password(
    request: dict,
    payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    old_password = request.get("old_password") or ""
    new_password = request.get("new_password") or ""

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(404, "User not found")
    if not user.password_hash or not _verify_password(old_password, user.password_hash):
        raise HTTPException(401, "Current password is incorrect")
    if len(new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")

    user.password_hash = _hash_password(new_password)
    db.commit()
    return {"success": True, "message": "Password changed"}


@app.post("/api/auth/send-otp", tags=["auth"])
async def send_otp(request: dict, req: Request):
    # 5 OTPs per IP per 10 minutes — stops spam/harassment + email-cost abuse
    throttle(req, "otp-send", max_hits=5, window_sec=600)

    email = request.get("email", "").lower().strip()
    name = request.get("name", "User")
    purpose = request.get("purpose", "verification")

    if not email:
        raise HTTPException(400, "Email required")
    # Basic email format check
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "Invalid email format")

    # Generate 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)

    # Store with 10 min expiry
    otp_store[email] = {
        "otp": otp,
        "expires": datetime.utcnow().timestamp() + 600,
        "attempts": 0,
    }

    html = otp_email_template(name, otp, purpose)
    result = await send_email(email, "Your Eprohori OTP", html, name)

    if result["success"]:
        return {
            "success": True,
            "provider": result["provider"],
            "message": f"OTP sent to {email}",
        }
    raise HTTPException(500, "Failed to send OTP")


@app.post("/api/auth/verify-otp", tags=["auth"])
async def verify_otp(request: dict):
    email = request.get("email", "").lower().strip()
    otp_input = request.get("otp", "")

    stored = otp_store.get(email)
    if not stored:
        raise HTTPException(400, "OTP not found. Request a new one.")

    if datetime.utcnow().timestamp() > stored["expires"]:
        del otp_store[email]
        raise HTTPException(400, "OTP expired. Request a new one.")

    if stored["attempts"] >= 3:
        del otp_store[email]
        raise HTTPException(400, "Too many attempts. Request a new OTP.")

    # Constant-time compare to neutralise timing-based OTP guessing
    if not secrets.compare_digest(stored["otp"], otp_input or ""):
        otp_store[email]["attempts"] += 1
        raise HTTPException(400, "Incorrect OTP")

    del otp_store[email]
    return {"success": True, "message": "OTP verified"}


@app.post("/api/auth/forgot-password", tags=["auth"])
async def forgot_password(request: dict, req: Request, db: Session = Depends(get_db)):
    """Send a password-reset OTP. Always returns success (never leaks whether the email exists)."""
    throttle(req, "forgot-password", max_hits=5, window_sec=600)
    email = (request.get("email") or "").lower().strip()
    generic = {"success": True, "message": "যদি এই ইমেইলে অ্যাকাউন্ট থাকে, একটি OTP পাঠানো হয়েছে।"}
    if not _EMAIL_RE.match(email):
        return generic

    user = db.query(User).filter(User.email == email).first()
    # Only send if the account exists and has a password — but response is identical either way
    if user and user.password_hash:
        otp = str(secrets.randbelow(900000) + 100000)
        otp_store[email] = {"otp": otp, "expires": datetime.utcnow().timestamp() + 600, "attempts": 0}
        html = otp_email_template(user.name or "User", otp, "password reset")
        await send_email(email, "Eprohori — Password Reset OTP", html, user.name or "User")
    return generic


@app.post("/api/auth/reset-password", tags=["auth"])
def reset_password(request: dict, req: Request, db: Session = Depends(get_db)):
    """Verify the reset OTP and set a new password."""
    throttle(req, "reset-password", max_hits=10, window_sec=600)
    email = (request.get("email") or "").lower().strip()
    otp_input = request.get("otp") or ""
    new_password = request.get("new_password") or ""

    if len(new_password) < 8:
        raise HTTPException(400, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে")

    stored = otp_store.get(email)
    if not stored:
        raise HTTPException(400, "OTP পাওয়া যায়নি — নতুন করে চেষ্টা করুন")
    if datetime.utcnow().timestamp() > stored["expires"]:
        del otp_store[email]
        raise HTTPException(400, "OTP-এর মেয়াদ শেষ — নতুন করে চেষ্টা করুন")
    if stored["attempts"] >= 3:
        del otp_store[email]
        raise HTTPException(400, "অনেকবার ভুল হয়েছে — নতুন OTP নিন")
    if not secrets.compare_digest(stored["otp"], otp_input):
        otp_store[email]["attempts"] += 1
        raise HTTPException(400, "ভুল OTP")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(400, "অ্যাকাউন্ট পাওয়া যায়নি")

    user.password_hash = _hash_password(new_password)
    db.commit()
    del otp_store[email]
    return {"success": True, "message": "পাসওয়ার্ড পরিবর্তন হয়েছে — এখন লগইন করুন"}


# ─────────────────────────────────────────────────────────────────────────────
# AI Validation
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/validate/text", response_model=ValidateTextResponse, tags=["ai"])
def validate_text(req: ValidateTextRequest):
    if len(req.text or "") > MAX_THREAT_CONTENT_LEN:
        raise HTTPException(413, f"Text too long (max {MAX_THREAT_CONTENT_LEN} characters)")
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text cannot be empty")
    ml_result = validator.predict(req.text)
    result = claude_analyzer.hybrid_predict(req.text, ml_result)
    return ValidateTextResponse(**result)


@app.post("/api/validate/profile", response_model=ValidateProfileResponse, tags=["ai"])
def validate_profile(req: ValidateProfileRequest):
    result = profile_validator.predict(req.model_dump())
    return ValidateProfileResponse(**result)


# ─────────────────────────────────────────────────────────────────────────────
# Phone check
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/check/phone", response_model=CheckPhoneResponse, tags=["phone"])
def check_phone(req: CheckPhoneRequest):
    if not req.number.strip():
        raise HTTPException(status_code=422, detail="number cannot be empty")
    return CheckPhoneResponse(**phone_checker.check_phone(req.number))


# ─────────────────────────────────────────────────────────────────────────────
# Admin
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/admin/backup", tags=["admin"])
def admin_backup(_admin: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """JSON dump of all tables — for off-site backup. Streams; do not call casually."""
    from fastapi.responses import StreamingResponse
    import json

    def _serialize(obj):
        d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
        for k, v in d.items():
            if isinstance(v, (datetime, date)):
                d[k] = v.isoformat()
        return d

    def gen():
        yield '{"exported_at":"' + datetime.utcnow().isoformat() + 'Z",'
        for tbl_name, model in [
            ("users", User), ("threats", Threat), ("alerts", Alert),
            ("admin_audits", AdminAudit), ("phone_blacklist", PhoneBlacklist),
            ("impact_feedback", ImpactFeedback),
        ]:
            rows = db.query(model).all()
            yield f'"{tbl_name}":' + json.dumps([_serialize(r) for r in rows]) + ","
        yield '"_end":true}'

    fname = f"eprohori-backup-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.json"
    return StreamingResponse(
        gen(),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@app.get("/api/admin/pending", response_model=list[ThreatOut], tags=["admin"])
def admin_pending(_admin: dict = Depends(require_admin), db: Session = Depends(get_db)):
    return (
        db.query(Threat)
        .filter(Threat.status == "pending")
        .order_by(Threat.created_at.desc())
        .all()
    )


@app.put("/api/threats/{threat_id}/approve", response_model=StatusResponse, tags=["admin"])
def approve_threat(threat_id: int, admin: dict = Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Threat).filter(Threat.id == threat_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Threat not found")
    t.status = "verified"
    db.commit()
    _log_audit(db, admin.get("sub", "admin"), "approve", f"threat #{threat_id}")
    return StatusResponse(status="verified")


@app.patch("/api/threats/{threat_id}/verify", tags=["admin"])
async def verify_threat(
    threat_id: int,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin verifies a pending threat. Triggers district-wide alert emails
    if AI confidence is at or above the HIGH threshold (70%+)."""
    t = db.query(Threat).filter(Threat.id == threat_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Threat not found")

    t.status = "verified"
    db.commit()
    db.refresh(t)
    _log_audit(db, admin.get("sub", "admin"), "verify", f"threat #{threat_id}")

    conf = (t.confidence or 0)
    if conf > 1:
        conf = conf / 100
    if conf >= ALERT_HIGH_MIN:
        background_tasks.add_task(send_alert_emails, t.id)
        return {"verified": True, "emails_sent": True, "severity": get_severity(conf)}
    return {"verified": True, "emails_sent": False, "severity": get_severity(conf)}


@app.put("/api/threats/{threat_id}/reject", response_model=StatusResponse, tags=["admin"])
def reject_threat(threat_id: int, admin: dict = Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Threat).filter(Threat.id == threat_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Threat not found")
    t.status = "rejected"
    db.commit()
    _log_audit(db, admin.get("sub", "admin"), "reject", f"threat #{threat_id}")
    return StatusResponse(status="rejected")


@app.post("/api/alerts/broadcast", response_model=AlertOut, status_code=201, tags=["admin"])
def broadcast_alert(payload: BroadcastRequest, admin: dict = Depends(require_admin), db: Session = Depends(get_db)):
    a = Alert(title=payload.title, message=payload.message, severity=payload.severity)
    db.add(a)
    db.commit()
    db.refresh(a)
    _log_audit(db, admin.get("sub", "admin"), "broadcast", payload.title)
    return a


@app.get("/api/admin/audit", tags=["admin"])
def admin_audit(admin: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Recent admin actions — accountability log for the multi-admin panel."""
    rows = db.query(AdminAudit).order_by(AdminAudit.created_at.desc()).limit(30).all()
    return [
        {
            "id": r.id,
            "admin_email": r.admin_email,
            "action": r.action,
            "target": r.target,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "Eprohori API", "version": "1.0.0"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
