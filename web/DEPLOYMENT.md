# EProhori Deployment Guide

## Quick Start

Deploy EProhori on Railway in 5 minutes.

### Prerequisites

- Railway account (railway.app)
- GitHub account with repo access
- Environment variables ready

---

## Step 1: Railway Backend Setup

### 1a. Create PostgreSQL Database

1. Go to [railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy DATABASE_URL from Variables tab

### 1b. Create Backend Service

1. Add New → GitHub Repo → Select Eprohori
2. Select backend directory: `/backend`
3. Environment variables (add these):

```
DATABASE_URL=postgresql://...  # From step 1a
ANTHROPIC_API_KEY=sk-...
GROQ_API_KEY=gsk-...
GEMINI_API_KEY=AIza...
VIRUSTOTAL_API_KEY=...
SENTRY_DSN=https://...
BREVO_API_KEY=...
RESEND_API_KEY=...
ENVIRONMENT=production
```

4. Deploy → Auto-deploys on git push

---

## Step 2: Vercel Frontend Setup

### 2a. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Import Git repo → Select Eprohori
3. Framework: Next.js
4. Root directory: `/frontend`

### 2b. Environment Variables

```
NEXT_PUBLIC_API_URL=https://your-railway-api.up.railway.app
```

5. Deploy

---

## Step 3: Database Migration

### Run migrations after deployment:

```bash
# SSH into Railway backend
railway shell

# Run migrations
alembic upgrade head

# Seed data (optional)
python seed.py
```

---

## Step 4: Verification

### Health Check

```bash
curl https://your-api.up.railway.app/health
# Expected: {"status":"ok"}
```

### API Documentation

```
https://your-api.up.railway.app/docs    (Swagger UI)
https://your-api.up.railway.app/redoc   (ReDoc)
```

### Chatbot Test

```bash
curl -X POST https://your-api.up.railway.app/api/chatbot/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"phishing test","language":"en"}'
```

---

## Step 5: Monitoring

### Sentry Error Tracking

- Go to sentry.io dashboard
- Check "Issues" for any errors
- Configure alerts if needed

### Railway Logs

- Railway console shows real-time logs
- Check for warnings/errors

---

## Environment Variables Full List

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
ADMIN_USER_ID=1

# AI/ML
ANTHROPIC_API_KEY=sk-...
GROQ_API_KEY=gsk-...
GEMINI_API_KEY=AIza...

# Threat Intelligence
VIRUSTOTAL_API_KEY=...
HUGGING_FACE_API_KEY=...

# Email
BREVO_API_KEY=...
RESEND_API_KEY=...

# Monitoring
SENTRY_DSN=https://...
ENVIRONMENT=production

# CORS
ALLOWED_ORIGINS=https://eprohori.tech,https://www.eprohori.tech

# Optional: 2FA
ENCRYPTION_KEY=<base64-32-byte-key>

# Optional: Redis Caching
REDIS_HOST=redis-host.railway.app
REDIS_PORT=6379

# Optional: S3 Screenshot Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
```

---

## Troubleshooting

### 502 Bad Gateway

```bash
# Check backend logs in Railway console
# Common causes:
#   - Missing DATABASE_URL
#   - Database migration failed
#   - Import error in main.py
```

### API returns 500 errors

```bash
# Check Sentry dashboard for actual error
# Or check Railway logs
```

### Frontend can't reach API

```bash
# Verify NEXT_PUBLIC_API_URL is correct
# Check CORS settings in backend
# Verify Railway backend is deployed
```

---

## Rolling Back Deployment

### Railway Backend

1. Go to Deployments tab
2. Click previous deployment
3. Click "Redeploy" button

### Vercel Frontend

1. Go to Deployments
2. Select previous deployment
3. Click "Promote to Production"

---

## Performance Optimization

### Enable Redis Caching

```bash
# Add to Railway
REDIS_HOST=redis-host
REDIS_PORT=6379

# Restart backend
```

### Database Optimization

```sql
-- Archive old threats
INSERT INTO threats_archived
SELECT * FROM threats WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM threats WHERE created_at < NOW() - INTERVAL '90 days';

-- Create indexes
CREATE INDEX idx_threats_created ON threats(created_at DESC);
CREATE INDEX idx_alerts_user ON alerts(user_id);
```

---

## Monitoring Checklist

- [ ] Sentry error tracking active
- [ ] Railway metrics visible
- [ ] Database backups enabled
- [ ] API docs accessible
- [ ] Chatbot responding within 5s
- [ ] Email alerts working
- [ ] OTP verification working
- [ ] Admin dashboard loading

---

## Security Checklist

- [ ] All secrets in environment variables
- [ ] No secrets in git repository
- [ ] CORS restricted to known origins
- [ ] JWT secret is strong (32+ chars)
- [ ] SSL/TLS enabled (automatic on Railway/Vercel)
- [ ] Rate limiting enabled
- [ ] 2FA enabled for admin accounts
- [ ] Sentry configured for errors
- [ ] Database daily backups

---

## Support

For deployment issues:
1. Check Railway logs
2. Verify all environment variables set
3. Check Sentry for errors
4. Contact: eprohoribd@gmail.com

---

**Last Updated**: 2026-06-26
**Status**: Production Ready
