"""
EProhori notification service
Dual email provider (Resend primary -> Brevo fallback) + optional Telegram.

── SETUP GUIDE ──────────────────────────────────────────────────────────────
RESEND SETUP (Free: 3000 emails/month):
  1. resend.com -> Sign up free
  2. Add domain OR use onboarding email
  3. API Keys -> Create key
  4. Add to .env: RESEND_API_KEY=re_xxxxx

BREVO SETUP (Free: 300 emails/day):
  1. brevo.com -> Sign up free
  2. SMTP & API -> API Keys -> Generate
  3. Add to .env: BREVO_API_KEY=xkeysib-xxxxx

TELEGRAM BOT (Optional):
  1. Message @BotFather on Telegram
  2. /newbot -> get token
  3. Add bot to a group/channel
  4. Get chat ID
  5. Add to .env: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
─────────────────────────────────────────────────────────────────────────────
"""

import os

import httpx

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
FROM_EMAIL = os.getenv("FROM_EMAIL", "mkniloy1568@gmail.com")
FROM_NAME = os.getenv("FROM_NAME", "EProhori")


async def send_via_resend(
    to_email: str,
    subject: str,
    html_content: str,
    name: str = "",
) -> bool:
    if not RESEND_API_KEY:
        return False
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"{FROM_NAME} <{FROM_EMAIL}>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                },
                timeout=15,
            )
            if response.status_code != 200:
                print(f"[notify] Resend HTTP {response.status_code}: {response.text[:200]}")
            return response.status_code == 200
    except Exception as e:  # noqa: BLE001
        print(f"[notify] Resend failed: {e}")
        return False


async def send_via_brevo(
    to_email: str,
    subject: str,
    html_content: str,
    name: str = "",
) -> bool:
    if not BREVO_API_KEY:
        return False
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": BREVO_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
                    "to": [{"email": to_email, "name": name or to_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                },
                timeout=15,
            )
            if response.status_code != 201:
                print(f"[notify] Brevo HTTP {response.status_code}: {response.text[:200]}")
            return response.status_code == 201
    except Exception as e:  # noqa: BLE001
        print(f"[notify] Brevo failed: {e}")
        return False


async def send_telegram(message: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "HTML",
                },
                timeout=15,
            )
            return response.status_code == 200
    except Exception as e:  # noqa: BLE001
        print(f"[notify] Telegram failed: {e}")
        return False


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    name: str = "",
) -> dict:
    """Try Resend first, fall back to Brevo."""
    if await send_via_resend(to_email, subject, html_content, name):
        return {"success": True, "provider": "resend"}

    print("[notify] Resend failed, trying Brevo...")

    if await send_via_brevo(to_email, subject, html_content, name):
        return {"success": True, "provider": "brevo"}

    print(f"[notify] Both email providers failed for {to_email}")
    return {"success": False, "provider": None}


# ── Email templates ──────────────────────────────────────────────────────────

# Brand header: the main navbar logo (hosted on the site, same image everywhere)
EMAIL_LOGO_URL = os.getenv("EMAIL_LOGO_URL", "https://eprohori.tech/logo.png")
EMAIL_LOGO_HTML = f"""
        <div style="text-align:center;margin-bottom:24px">
          <img src="{EMAIL_LOGO_URL}" alt="EProhori" width="180"
            style="display:inline-block;max-width:180px;height:auto;border:0;outline:none" />
        </div>
"""


_ROLE_LABELS_BN = {
    "government": "সরকারি সংস্থা",
    "journalist": "সাংবাদিক",
    "researcher": "গবেষক",
    "other": "অন্যান্য",
}


def partner_inquiry_template(
    name: str, organization: str, role: str,
    email: str, phone: str, message: str,
) -> str:
    """Internal notification email sent to the team when an org/journalist/researcher writes in."""
    def esc(s: str) -> str:
        return (s or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    role_bn = _ROLE_LABELS_BN.get(role, role or "—")
    msg_html = esc(message).replace("\n", "<br/>")
    row = (
        "<tr><td style='padding:6px 0;color:#94a3b8;width:120px;vertical-align:top'>{k}</td>"
        "<td style='padding:6px 0;color:#e2e8f0'>{v}</td></tr>"
    )
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:520px;margin:0 auto;background:#0d1829;border-radius:16px;
                  border:1px solid rgba(0,229,196,0.2);padding:36px">
        {EMAIL_LOGO_HTML}
        <h2 style="color:#fff;font-size:18px;text-align:center;margin:0 0 6px">নতুন যোগাযোগ অনুরোধ</h2>
        <p style="color:#00e5c4;text-align:center;font-size:13px;margin:0 0 24px">{role_bn}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          {row.format(k="নাম", v=esc(name))}
          {row.format(k="প্রতিষ্ঠান", v=esc(organization))}
          {row.format(k="ধরন", v=role_bn)}
          {row.format(k="ইমেইল", v=esc(email))}
          {row.format(k="ফোন", v=esc(phone))}
        </table>
        <div style="margin-top:20px;padding:16px;background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.06);border-radius:12px">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 8px">বার্তা</p>
          <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0">{msg_html}</p>
        </div>
        <p style="color:#475569;font-size:11px;text-align:center;margin-top:24px">
          EProhori — eprohori.tech থেকে স্বয়ংক্রিয়ভাবে পাঠানো
        </p>
      </div>
    </body>
    </html>
    """


def otp_email_template(name: str, otp: str, purpose: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;
                 color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:480px;margin:0 auto;
                  background:#0d1829;border-radius:16px;
                  border:1px solid rgba(0,229,196,0.2);
                  padding:40px">
        {EMAIL_LOGO_HTML}
        <div style="text-align:center;margin-bottom:32px">
          <p style="color:#94a3b8;font-size:14px;margin:8px 0 0">
            Bangladesh's Cyber Intelligence Platform
          </p>
        </div>

        <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px">
          Verification Code
        </h2>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 32px">
          Hi {name}, use this code for {purpose}:
        </p>

        <div style="background:#060d1a;border-radius:12px;
                    border:2px solid #00e5c4;padding:24px;
                    text-align:center;margin:0 0 32px">
          <span style="font-size:42px;font-weight:bold;
                       color:#00e5c4;letter-spacing:12px">
            {otp}
          </span>
        </div>

        <div style="background:rgba(255,68,68,0.1);
                    border:1px solid rgba(255,68,68,0.3);
                    border-radius:8px;padding:16px;
                    margin:0 0 24px">
          <p style="color:#ff6b6b;font-size:13px;margin:0">
            ⚠️ This code expires in <strong>10 minutes</strong>.
            Never share this code with anyone.
          </p>
        </div>

        <p style="color:#64748b;font-size:12px;
                  text-align:center;margin:0">
          If you didn't request this, ignore this email.
          <br>© 2025 EProhori · Bangladesh
        </p>
      </div>
    </body>
    </html>
    """


def user_alert_email_template(
    threat_type: str,
    district: str,
    detail: str,
    confidence: int,
    severity: str,
    threat_id: int,
) -> str:
    """District-wide user alert. Differentiated styling for critical vs high."""
    is_critical = severity == "critical"
    accent = "#ff4444" if is_critical else "#f59e0b"
    icon = "🚨" if is_critical else "⚠️"
    label = "CRITICAL THREAT — Verified by EProhori" if is_critical else "HIGH RISK THREAT — Verified by EProhori"
    sub = ("EProhori has identified this as a critical threat. Take immediate action."
           if is_critical
           else "EProhori has verified this threat. Stay alert.")

    safety_tips = [
        "কোনো সন্দেহজনক লিংকে ক্লিক করবেন না",
        "OTP/PIN/পাসওয়ার্ড কারো সাথে শেয়ার করবেন না",
        "অপরিচিত নম্বর/ইমেইল-এর অনুরোধ যাচাই করুন",
        "পরিচিতদের এই হুমকি সম্পর্কে জানান",
        "প্রতারিত হলে হেল্পলাইন 999 এ কল করুন",
    ]
    tips_html = "".join(
        f'<li style="color:#94a3b8;font-size:13px;margin-bottom:6px">'
        f'<span style="color:#00e5c4;margin-right:6px">▸</span>{t}</li>'
        for t in safety_tips
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;
                 color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:560px;margin:0 auto;background:#0d1829;border-radius:16px;
                  border:1px solid {accent}55;border-top:4px solid {accent};padding:36px">
        {EMAIL_LOGO_HTML}

        <div style="background:{accent}15;border:1px solid {accent}44;
                    border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
          <p style="color:{accent};font-size:14px;font-weight:bold;
                    text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px">
            {icon} {label}
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:0">{sub}</p>
        </div>

        <table style="width:100%;margin-bottom:24px">
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">Type:</td>
              <td style="color:#e2e8f0;font-size:13px;font-weight:bold;text-align:right">{threat_type.upper()}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">District:</td>
              <td style="color:#e2e8f0;font-size:13px;font-weight:bold;text-align:right">{district or 'Bangladesh'}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:4px 0">EProhori Confidence:</td>
              <td style="color:{accent};font-size:13px;font-weight:bold;text-align:right">{confidence}%</td></tr>
        </table>

        <div style="background:#060d1a;border-radius:10px;padding:14px;margin-bottom:24px;
                    border-left:3px solid {accent}">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 6px">Threat detail:</p>
          <p style="color:#e2e8f0;font-size:13px;margin:0;word-break:break-all">{detail}</p>
        </div>

        <p style="color:#00e5c4;font-size:13px;font-weight:bold;margin:0 0 10px">
          🛡️ Stay Safe
        </p>
        <ul style="padding-left:0;list-style:none;margin:0 0 24px">{tips_html}</ul>

        <a href="https://eprohori.vercel.app/report/{threat_id}"
           style="display:block;background:{accent};color:#060d1a;text-align:center;
                  padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;
                  margin-bottom:20px">
          View Full Details →
        </a>

        <p style="color:#64748b;font-size:11px;text-align:center;margin:0">
          You're getting this because your district is affected.
          <br>Manage notifications:
          <a href="https://eprohori.vercel.app/account" style="color:#00e5c4;text-decoration:none">Account settings</a>
          <br>© 2025 EProhori · Bangladesh
        </p>
      </div>
    </body>
    </html>
    """


def report_result_email_template(
    name: str,
    threat_type: str,
    confidence: int,
    reason: str,
    district: str,
) -> str:
    """Sent to the reporter when their report is confirmed as a real threat."""
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;
                 color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:520px;margin:0 auto;background:#0d1829;border-radius:16px;
                  border:1px solid rgba(0,229,196,0.2);padding:40px">
        {EMAIL_LOGO_HTML}
        <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px">
          Your Report Analysis
        </h2>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
          Hi {name}, thank you for protecting the community. Our AI confirmed
          your report as a real threat.
        </p>

        <div style="background:rgba(255,68,68,0.08);border:1px solid rgba(255,68,68,0.3);
                    border-radius:12px;padding:20px;margin:0 0 24px">
          <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px">
            <strong>Type:</strong> {threat_type.upper()}
          </p>
          <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px">
            <strong>District:</strong> {district or '—'}
          </p>
          <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px">
            <strong>EProhori Confidence:</strong>
            <span style="color:#00e5c4;font-weight:bold"> {confidence}%</span>
          </p>
          <p style="color:#94a3b8;font-size:13px;margin:0">
            <strong>Analysis:</strong> {reason}
          </p>
        </div>

        <a href="https://eprohori.vercel.app/monitor"
           style="display:block;background:#00e5c4;color:#060d1a;text-align:center;
                  padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;
                  margin-bottom:24px">
          View on EProhori →
        </a>

        <p style="color:#64748b;font-size:12px;text-align:center;margin:0">
          🛡️ Every report makes Bangladesh safer.
          <br>© 2025 EProhori · Bangladesh
        </p>
      </div>
    </body>
    </html>
    """


def report_approved_email_template(name: str, threat_type: str, district: str) -> str:
    """Sent to the reporter when an admin manually approves their report."""
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;
                 color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:520px;margin:0 auto;background:#0d1829;border-radius:16px;
                  border:1px solid rgba(0,229,196,0.2);padding:40px">
        {EMAIL_LOGO_HTML}
        <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px">
          আপনার রিপোর্ট অনুমোদিত হয়েছে ✅
        </h2>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">
          প্রিয় {name}, আপনাকে ধন্যবাদ। আমাদের EProhori টিম আপনার রিপোর্টটি
          পর্যালোচনা করে অনুমোদন দিয়েছে — এটি এখন সবাইকে সতর্ক করার জন্য
          সক্রিয় করা হয়েছে।
        </p>

        <div style="background:rgba(0,229,196,0.08);border:1px solid rgba(0,229,196,0.3);
                    border-radius:12px;padding:20px;margin:0 0 24px">
          <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px">
            <strong>ধরন:</strong> {threat_type.upper()}
          </p>
          <p style="color:#e2e8f0;font-size:14px;margin:0">
            <strong>জেলা:</strong> {district or 'বাংলাদেশ'}
          </p>
        </div>

        <p style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0 0 24px">
          আপনার সতর্কতার কারণে হাজারো মানুষ এই হুমকি থেকে রক্ষা পাবে।
          EProhori-এর সাথে থাকার জন্য আন্তরিক ধন্যবাদ।
        </p>

        <a href="https://eprohori.vercel.app/monitor"
           style="display:block;background:#00e5c4;color:#060d1a;text-align:center;
                  padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;
                  margin-bottom:24px">
          Monitor-এ দেখুন →
        </a>

        <p style="color:#64748b;font-size:12px;text-align:center;margin:0">
          🛡️ প্রতিটি রিপোর্ট বাংলাদেশকে নিরাপদ করে।
          <br>© 2025 EProhori · Bangladesh
        </p>
      </div>
    </body>
    </html>
    """


def report_safe_email_template(name: str) -> str:
    """Sent to the reporter when their report is reviewed and found to be safe."""
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;
                 color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:520px;margin:0 auto;background:#0d1829;border-radius:16px;
                  border:1px solid rgba(34,197,94,0.2);padding:40px">
        {EMAIL_LOGO_HTML}
        <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px">
          আপনার রিপোর্ট যাচাই হয়েছে ✅
        </h2>
        <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);
                    border-radius:12px;padding:20px;margin:16px 0 24px">
          <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px">
            প্রিয় {name},
          </p>
          <p style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0">
            আপনার পাঠানো রিপোর্টটি আমাদের টিম যাচাই করেছে — এটি
            <strong style="color:#22c55e">নিরাপদ</strong> পাওয়া গেছে, কোনো হুমকি নয়।
            সতর্ক থাকার জন্য ও কমিউনিটিকে সুরক্ষিত রাখতে সাহায্য করার জন্য
            আপনাকে অসংখ্য ধন্যবাদ। 🙏
          </p>
        </div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 24px">
          ভুল হতে পারে এই ভেবে দ্বিধা করবেন না — সন্দেহ হলেই রিপোর্ট করুন।
          আপনার সতর্কতাই বাংলাদেশকে নিরাপদ রাখে।
        </p>
        <a href="https://eprohori.tech/report"
           style="display:block;background:#00e5c4;color:#060d1a;text-align:center;
                  padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;
                  margin-bottom:24px">
          আরও রিপোর্ট করুন →
        </a>
        <p style="color:#64748b;font-size:12px;text-align:center;margin:0">
          🛡️ প্রতিটি রিপোর্ট বাংলাদেশকে নিরাপদ করে।
          <br>© 2026 EProhori · Bangladesh
        </p>
      </div>
    </body>
    </html>
    """


def digest_alert_template(items: list) -> str:
    """Hourly digest: one email summarising multiple threats instead of a flood."""
    rows = "".join(
        f"""<tr>
          <td style="padding:8px 10px;color:{'#ff4444' if i['severity'] == 'critical' else '#f59e0b'};
                     font-size:12px;font-weight:bold;text-transform:uppercase">{i['severity']}</td>
          <td style="padding:8px 10px;color:#e2e8f0;font-size:13px">{i['type'].upper()}</td>
          <td style="padding:8px 10px;color:#94a3b8;font-size:12px">{i['division'] or '—'}</td>
          <td style="padding:8px 10px;color:#94a3b8;font-size:12px;word-break:break-all">{i['detail'][:60]}…</td>
        </tr>"""
        for i in items[:10]
    )
    more = f"<p style='color:#64748b;font-size:12px'>…and {len(items) - 10} more</p>" if len(items) > 10 else ""
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:560px;margin:0 auto;background:#0d1829;border-radius:16px;
                  border:1px solid rgba(0,229,196,0.2);padding:32px">
        {EMAIL_LOGO_HTML}
        <h1 style="color:#00e5c4;font-size:20px;margin:0 0 4px">🛡️ EProhori Threat Digest</h1>
        <p style="color:#94a3b8;font-size:13px;margin:0 0 20px">
          {len(items)} new high-priority threats detected in the last hour
        </p>
        <table style="width:100%;border-collapse:collapse;background:#060d1a;border-radius:8px">
          {rows}
        </table>
        {more}
        <a href="https://eprohori.vercel.app/monitor"
           style="display:block;background:#00e5c4;color:#060d1a;text-align:center;
                  padding:12px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:20px">
          View all on EProhori Monitor →
        </a>
      </div>
    </body>
    </html>
    """


def threat_alert_template(
    threat_type: str,
    division: str,
    detail: str,
    severity: str,
    confidence: int,
) -> str:
    severity_color = {
        'critical': '#ff4444',
        'high': '#f59e0b',
        'medium': '#3b82f6',
        'low': '#22c55e',
    }.get(severity, '#94a3b8')

    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#060d1a;
                 color:#e2e8f0;padding:40px 20px;margin:0">
      <div style="max-width:520px;margin:0 auto;
                  background:#0d1829;border-radius:16px;
                  border:1px solid {severity_color}44;
                  padding:40px">
        {EMAIL_LOGO_HTML}
        <div style="display:flex;align-items:center;
                    margin-bottom:24px">
          <h1 style="color:#00e5c4;font-size:20px;margin:0">
            🛡️ EProhori Alert
          </h1>
        </div>

        <div style="background:{severity_color}22;
                    border:1px solid {severity_color}44;
                    border-radius:12px;padding:20px;
                    margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;
                      align-items:center;margin-bottom:12px">
            <span style="color:{severity_color};font-weight:bold;
                         text-transform:uppercase;font-size:13px">
              {severity} THREAT DETECTED
            </span>
            <span style="color:#94a3b8;font-size:13px">
              EProhori Confidence: {confidence}%
            </span>
          </div>

          <p style="color:#e2e8f0;font-size:14px;
                    margin:0 0 8px">
            <strong>Type:</strong> {threat_type.upper()}
          </p>
          <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px">
            <strong>Division:</strong> {division}
          </p>
          <p style="color:#94a3b8;font-size:13px;margin:0;
                    word-break:break-all">
            <strong>Detail:</strong> {detail[:100]}...
          </p>
        </div>

        <a href="https://eprohori.vercel.app/monitor"
           style="display:block;background:#00e5c4;
                  color:#060d1a;text-align:center;
                  padding:14px;border-radius:8px;
                  text-decoration:none;font-weight:bold;
                  margin-bottom:24px">
          View on EProhori Monitor →
        </a>

        <p style="color:#64748b;font-size:12px;
                  text-align:center;margin:0">
          You're receiving this because you're a
          registered EProhori community member.
          <br>© 2025 EProhori · Bangladesh
        </p>
      </div>
    </body>
    </html>
    """
