from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ── Threats ───────────────────────────────────────────────────────────────────

class ThreatCreate(BaseModel):
    # Accept canonical names AND friendlier aliases used by external tooling/tests
    type: Optional[str] = None
    threat_type: Optional[str] = None      # alias for "type"
    content: Optional[str] = None
    detail: Optional[str] = None           # alias for "content"
    region: Optional[str] = None           # parent division (for the heat map)
    district: Optional[str] = None         # actual district selected by reporter
    confidence: Optional[float] = 0.0
    screenshot: Optional[str] = None       # base64 image (optional evidence)
    reporter_email: Optional[str] = None   # fallback when no auth token sent
    description: Optional[str] = None      # optional long-form description
    platform: Optional[str] = None         # bkash / nagad / facebook / etc.

    def normalized_type(self) -> str:
        return (self.type or self.threat_type or "").strip().lower()

    def normalized_content(self) -> str:
        return self.content or self.detail or ""


class ThreatOut(BaseModel):
    id: int
    type: str
    content: str
    region: Optional[str] = None
    district: Optional[str] = None
    confidence: float
    status: str
    up_votes: int
    is_campaign: int = 0
    screenshot: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    title: str
    message: str
    severity: str = "medium"


class AlertOut(BaseModel):
    id: int
    title: str
    message: str
    severity: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Rangers ───────────────────────────────────────────────────────────────────

class RangerOut(BaseModel):
    id: int
    name: str
    region: Optional[str] = None
    xp: int
    badge: str
    reports: int
    validated: int
    rank: int = 0

    model_config = {"from_attributes": True}


# ── AI Validation ─────────────────────────────────────────────────────────────

class ValidateTextRequest(BaseModel):
    text: str
    type: Optional[str] = None   # "url" routes through VirusTotal first


class ValidateTextResponse(BaseModel):
    is_threat: bool
    confidence: float
    category: str
    reasons: list[str]
    explanation: Optional[str] = None   # Bengali explanation from Claude (threats only)
    source: str = "ml"                  # "ml" or "ml+claude"


class PartnerInquiryRequest(BaseModel):
    """Outreach from government agencies, journalists, or researchers."""
    name: str
    organization: Optional[str] = None
    role: str = "other"   # government | journalist | researcher | other
    email: str
    phone: Optional[str] = None
    message: str


class ValidateProfileRequest(BaseModel):
    """13 numeric profile-activity fields (kept for API back-compat)."""
    friends: int = 0
    following: int = 0
    community: int = 0
    age: int = 0
    posts_shared: int = 0
    url_shared: int = 0
    photos_videos: int = 0
    fp_urls: int = 0
    fp_photos_videos: int = 0
    avg_comment: float = 0.0
    likes: float = 0.0
    tags: float = 0.0
    num_tags: int = 0


class ValidateProfileResponse(BaseModel):
    is_spam: bool
    confidence: float
    reasons: list[str]


# ── Stats & Heatmap ───────────────────────────────────────────────────────────

class StatsOut(BaseModel):
    total_threats: int
    today_reports: int
    active_threats: int
    alerted_people: int
    district_coverage: int
    rangers_count: int
    pending_count: int
    # New-contract aliases (same values, explicit names)
    total_reports: int = 0
    warned_count: int = 0
    rangers: int = 0
    districts_covered: int = 64
    saved_count: int = 0   # "Eprohori saved me from a scam" — pilot impact metric
    blocked_count: int = 0 # known threats = training-dataset phishing entries + verified reports


class DivisionOut(BaseModel):
    name: str
    threats: int
    color: str


class DistrictOut(BaseModel):
    name: str
    name_bn: str
    division: str
    lat: float
    lng: float
    threats: int
    color: str


class TrendingScamOut(BaseModel):
    rank: int
    type: str
    count: int
    example: str
    color: str
    percentage: int = 0
    division: Optional[str] = None


class ActivityOut(BaseModel):
    id: int
    type: str
    detail: str
    division: Optional[str] = None
    severity: str
    status: str
    created_at: datetime


# ── Phone Check ───────────────────────────────────────────────────────────────

class CheckPhoneRequest(BaseModel):
    number: str


class CheckPhoneResponse(BaseModel):
    number: str
    is_scam: bool
    message: str


# ── Admin & Quiz ──────────────────────────────────────────────────────────────

class BroadcastRequest(BaseModel):
    title: str
    message: str
    severity: str = "medium"


class QuizSubmission(BaseModel):
    answers: dict[str, str]   # {"q1": "b", "q2": "a", "q3": "c"}


class QuizResult(BaseModel):
    passed: bool
    score: int
    total: int
    xp_earned: int


class StatusResponse(BaseModel):
    status: str
