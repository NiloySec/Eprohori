# EPROHORI - GAPS FIX IMPLEMENTATION GUIDE

## Current Status: 7.8/10 → Target: 9.0/10

---

## PHASE 1: CRITICAL GAPS (Week 1-2)

### 1. MONITORING & ERROR TRACKING ✅

**Status**: Sentry initialized in main.py

**Implementation Checklist**:
- [x] Install sentry-sdk
- [x] Add Sentry initialization to main.py
- [ ] Create `.env.monitoring` config
- [ ] Set SENTRY_DSN environment variable
- [ ] Test error reporting

**Action**:
```bash
# Set in Railway environment:
SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID
ENVIRONMENT=production
```

**Result**: All errors logged to Sentry dashboard (errors, performance, breadcrumbs)

---

### 2. API DOCUMENTATION (Swagger/OpenAPI) 📋

**Status**: Not started

**Implementation**:
Add to main.py (after app initialization):

```python
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="EProhori API",
        version="1.0.0",
        description="Bangladesh Cybersecurity Threat Platform",
        routes=app.routes,
    )
    
    openapi_schema["info"]["x-logo"] = {
        "url": "https://eprohori.tech/logo.png"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

**Result**: 
- Swagger UI at `/docs`
- ReDoc at `/redoc`
- OpenAPI JSON at `/openapi.json`

---

### 3. DEPLOYMENT GUIDE 📚

**Create**: `DEPLOYMENT.md`

```markdown
# Deployment Guide

## Prerequisites
- Railway account
- GitHub account
- Environment variables configured

## Environment Variables
```
DATABASE_URL=postgresql://user:pass@host/db
ANTHROPIC_API_KEY=sk-...
GROQ_API_KEY=gsk-...
GEMINI_API_KEY=AIza...
VIRUSTOTAL_API_KEY=...
SENTRY_DSN=https://...
BREVO_API_KEY=...
RESEND_API_KEY=...
ENVIRONMENT=production
```

## Deployment Steps
1. Push to main branch
2. Railway auto-deploys
3. Run migrations: `alembic upgrade head`
4. Verify health: `curl https://api.eprohori.tech/health`
5. Test chatbot: POST /api/chatbot/analyze

## Monitoring
- Errors: Sentry dashboard
- Performance: Railway metrics
- Logs: Railway console

## Rollback
- Previous deployment available in Railway history
- Revert: Click "Redeploy" on previous version
```

---

### 4. TWO-FACTOR AUTHENTICATION (2FA) 🔐

**Status**: Not started

**Implementation** (add to main.py):

```python
import pyotp
from qrcode import QRCode

@app.post("/api/auth/2fa/setup")
def setup_2fa(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate secret
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    
    # Generate QR code
    totp = pyotp.TOTP(secret)
    qr = QRCode()
    qr.add_data(totp.provisioning_uri(name=user.email, issuer_name="EProhori"))
    qr.make()
    
    return {
        "secret": secret,
        "qr_code_url": qr.make_image().tobytes(),
        "message": "Scan with authenticator app"
    }

@app.post("/api/auth/2fa/verify")
def verify_2fa(email: str, otp: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not enabled")
    
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(otp):
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    user.totp_enabled = True
    db.commit()
    return {"message": "2FA enabled"}
```

**Result**: Users can enable TOTP-based 2FA with Google Authenticator/Authy

---

### 5. UNIT TESTS 🧪

**Create**: `backend/tests/test_api.py`

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_chatbot_phishing():
    response = client.post("/api/chatbot/analyze", json={
        "message": "Click here to verify password",
        "language": "en"
    })
    assert response.status_code == 200
    result = response.json()
    assert result["threat_type"] in ["Phishing", "Unknown"]
    assert "solution_steps" in result

def test_chatbot_scam():
    response = client.post("/api/chatbot/analyze", json={
        "message": "I won a lottery prize send money",
        "language": "en"
    })
    assert response.status_code == 200
    result = response.json()
    assert "threat_type" in result
    assert result["confidence"] >= 0.0

def test_invalid_language():
    response = client.post("/api/chatbot/analyze", json={
        "message": "test",
        "language": "invalid"
    })
    # Should still return something
    assert response.status_code in [200, 422]

def test_empty_message():
    response = client.post("/api/chatbot/analyze", json={
        "message": "",
        "language": "en"
    })
    # Should handle gracefully
    assert response.status_code == 200
```

**Run tests**:
```bash
cd backend
pytest tests/test_api.py -v
```

---

## PHASE 2: IMPORTANT GAPS (Week 3-4)

### 6. DATABASE OPTIMIZATION

**Archival Strategy**:
```sql
-- Archive threats older than 90 days
INSERT INTO threats_archived
SELECT * FROM threats 
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM threats 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Create index for faster queries
CREATE INDEX idx_threats_created_at ON threats(created_at DESC);
```

**Backup Automation**:
```bash
# Add to cron (daily backup at 2 AM)
0 2 * * * pg_dump $DATABASE_URL > /backups/eprohori_$(date +%Y%m%d).sql
```

---

### 7. DATABASE ENCRYPTION

Add to User model:
```python
from cryptography.fernet import Fernet

class User(Base):
    # ... existing fields ...
    phone_number_encrypted = Column(String)
    
    @property
    def phone_number(self):
        if self.phone_number_encrypted:
            cipher = Fernet(os.getenv("ENCRYPTION_KEY").encode())
            return cipher.decrypt(self.phone_number_encrypted).decode()
        return None
    
    @phone_number.setter
    def phone_number(self, value):
        if value:
            cipher = Fernet(os.getenv("ENCRYPTION_KEY").encode())
            self.phone_number_encrypted = cipher.encrypt(value.encode())
```

---

### 8. AUDIT LOGGING

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # login, report, approve, delete
    resource = Column(String)  # threat_id, user_id
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON)

def log_action(user_id: int, action: str, resource: str, details: dict, db: Session):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        details=details
    )
    db.add(log)
    db.commit()
```

---

### 9. CACHING (Redis)

```python
import redis

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True
)

@app.get("/api/threats")
def get_threats(db: Session = Depends(get_db)):
    # Check cache
    cached = redis_client.get("threats_list")
    if cached:
        return json.loads(cached)
    
    # Query database
    threats = db.query(Threat).limit(100).all()
    
    # Cache for 5 minutes
    redis_client.setex(
        "threats_list",
        300,
        json.dumps([t.to_dict() for t in threats])
    )
    
    return threats
```

---

## PHASE 3: NICE-TO-HAVE (Month 2-3)

### 10. WEB EXTENSION IMPROVEMENTS

```javascript
// background.js - Real-time blocklist update
chrome.alarms.create("updateBlocklist", { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateBlocklist") {
    fetch("https://api.eprohori.tech/api/threats/blocklist")
      .then(r => r.json())
      .then(data => {
        chrome.storage.local.set({ blocklist: data.threats });
      });
  }
});
```

---

### 11. ANALYTICS DASHBOARD

Create `/admin/analytics`:
- Threat trends (7-day, 30-day)
- Top threat types
- User engagement metrics
- Alert effectiveness
- Regional distribution

---

### 12. AI/ML IMPROVEMENTS

- Fine-tune zero-shot model on local threats
- Implement active learning (store low-confidence cases for review)
- Add confidence thresholds per threat type
- Track accuracy metrics over time

---

## ENVIRONMENT VARIABLES NEEDED

```
# Monitoring
SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID
ENVIRONMENT=production

# 2FA
ENCRYPTION_KEY=<base64-encoded-32-byte-key>

# Caching
REDIS_HOST=redis-host.railway.app
REDIS_PORT=6379

# Database
DATABASE_URL=postgresql://...

# API Keys
ANTHROPIC_API_KEY=sk-...
GROQ_API_KEY=gsk-...
GEMINI_API_KEY=AIza...
```

---

## TESTING CHECKLIST

- [ ] Unit tests passing (pytest)
- [ ] API documentation accessible (/docs)
- [ ] Sentry errors tracked
- [ ] 2FA setup flow working
- [ ] Database archival tested
- [ ] Caching working
- [ ] Deployment guide tested on new instance

---

## TIMELINE

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1 (Critical) | 2 weeks | 🔴 NOW |
| Phase 2 (Important) | 2 weeks | 🟡 Next |
| Phase 3 (Polish) | 4 weeks | 🟢 Later |

---

## ESTIMATED EFFORT

- Phase 1: 80 hours (2 developers, 2 weeks)
- Phase 2: 60 hours (2 developers, 2 weeks)
- Phase 3: 100 hours (2 developers, 4 weeks)

**Total: 240 hours → ~6 weeks with 2 developers**

---

## Success Criteria

✅ 7.8 → 8.5: Complete Phase 1
✅ 8.5 → 9.0: Complete Phase 2
✅ 9.0 → 9.5: Complete Phase 3
