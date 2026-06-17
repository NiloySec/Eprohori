# Security Policy

Eprohori is a cybersecurity platform — we take the security of our own
software seriously and welcome responsible disclosure.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **admin@eprohori.tech** with:

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept if possible)
- Any suggested remediation

We aim to acknowledge reports within **48 hours** and to provide a remediation
timeline within **7 days**. We will credit reporters who follow this policy
(unless you prefer to remain anonymous).

### Scope

In scope:
- `eprohori.tech` and `*.eprohori.tech`
- `eprohori-production.up.railway.app` (API)
- This source repository

Out of scope:
- Third-party services we depend on (Railway, Vercel, Sentry, Resend) — report
  to those vendors directly
- Social-engineering, physical attacks, or DoS/volumetric testing
- Automated scanner output without a demonstrated, exploitable impact

### Safe harbour

We will not pursue legal action against researchers who:
- Make a good-faith effort to avoid privacy violations and service disruption
- Do not exfiltrate, modify, or destroy data beyond what is needed to prove a
  vulnerability
- Give us reasonable time to remediate before public disclosure

## Our Security Posture

Implemented controls (see code + `tests/`):

- **Authentication:** JWT (HS256), short-lived tokens, sliding refresh
- **2FA:** optional TOTP (RFC 6238) for user accounts
- **Authorization:** role-gated admin endpoints; per-user data scoping (IDOR-tested)
- **Password storage:** PBKDF2-HMAC-SHA256, 100k iterations, per-user salt
- **Rate limiting:** per-IP throttle on login, admin-login, OTP, beta-signup
- **Input validation:** content-length caps (413), Pydantic schemas, email shape checks
- **Transport:** HTTPS enforced (Vercel + Railway managed TLS)
- **Headers:** X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **CORS:** explicit allow-list via `ALLOWED_ORIGINS`
- **Secrets:** environment variables only; never committed (`.env` gitignored)
- **Monitoring:** Sentry error tracking on the backend
- **Production gating:** `/docs` disabled and `JWT_SECRET` required when `ENV=production`

Automated test coverage: `backend/tests/` (auth, authz/IDOR, rate-limit,
input validation) runs on every push via GitHub Actions.

## Recommended Periodic Review

- [ ] Rotate `JWT_SECRET`, `ADMIN_PASSWORD`, and all third-party API keys quarterly
- [ ] Run an OWASP ZAP baseline scan against staging before major releases
- [ ] Review `AdminAudit` log for anomalous admin activity
- [ ] Re-run `python benchmark_ml.py` when the model dataset changes
