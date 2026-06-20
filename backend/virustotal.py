"""VirusTotal URL reputation lookup.

Used for URL-type checks where the Bangla text classifier is the wrong tool —
VT aggregates 70+ engines (domain reputation, blocklists, SSL, etc.), which is
the correct signal for URL safety and fixes text-model false positives.

Free tier limits: 500 lookups/day, 4/min — so results are cached in-memory.
API key comes from the VIRUSTOTAL_API_KEY env var (never hard-coded).
"""
from __future__ import annotations

import base64
import os
import time

import httpx

VT_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "").strip()
VT_BASE = "https://www.virustotal.com/api/v3"
_CACHE: dict[str, tuple[float, dict]] = {}   # url -> (expires_ts, result)
_CACHE_TTL = 6 * 3600                          # 6 hours


def _url_id(url: str) -> str:
    # VT v3 URL identifier: base64url of the URL, no padding
    return base64.urlsafe_b64encode(url.encode()).decode().strip("=")


def check_url(url: str) -> dict | None:
    """Return VT verdict for a URL, or None if VT is unavailable / has no data.

    Returns: {is_threat, confidence(0-1), malicious, suspicious, harmless, source}
    """
    if not VT_API_KEY or not url:
        return None

    now = time.time()
    cached = _CACHE.get(url)
    if cached and cached[0] > now:
        return cached[1]

    try:
        headers = {"x-apikey": VT_API_KEY}
        with httpx.Client(timeout=8) as client:
            resp = client.get(f"{VT_BASE}/urls/{_url_id(url)}", headers=headers)
            if resp.status_code == 404:
                # Unknown to VT — submit it for future lookups, but don't block now
                try:
                    client.post(f"{VT_BASE}/urls", headers=headers, data={"url": url})
                except Exception:  # noqa: BLE001
                    pass
                return None
            if resp.status_code != 200:
                return None
            stats = resp.json()["data"]["attributes"]["last_analysis_stats"]
    except Exception:  # noqa: BLE001
        return None

    malicious = stats.get("malicious", 0)
    suspicious = stats.get("suspicious", 0)
    harmless = stats.get("harmless", 0)
    total = malicious + suspicious + harmless + stats.get("undetected", 0) or 1

    # A SINGLE engine flag is noise — legit sites (e.g. domain marketplaces like
    # afternic.com) routinely get 1 low-quality engine false-flag. Require corroboration:
    # ≥2 malicious, OR 1 malicious backed by a suspicious, OR ≥3 suspicious.
    is_threat = malicious >= 2 or (malicious >= 1 and suspicious >= 1) or suspicious >= 3
    # `confidence` is a RISK score (0 = safe, 1 = definitely phishing) — the whole
    # app's gauge interprets it that way. So safe URLs must be LOW, threats HIGH.
    if is_threat:
        if malicious >= 5:
            conf = 0.97
        elif malicious >= 2:
            conf = 0.88
        else:  # 1 malicious + suspicious, or suspicious-only
            conf = 0.75
    else:
        conf = 0.03  # no meaningful detections → very low risk

    result = {
        "is_threat": is_threat,
        "confidence": round(min(conf, 0.99), 4),
        "malicious": malicious,
        "suspicious": suspicious,
        "harmless": harmless,
        "source": "virustotal",
    }
    _CACHE[url] = (now + _CACHE_TTL, result)
    return result
