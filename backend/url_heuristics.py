"""Lightweight URL phishing heuristics — used when VirusTotal has no data on a URL.

Catches obvious brand-impersonation / lookalike URLs (e.g. bkash.reward.xyz) that
aren't in VT yet, WITHOUT false-positiving legit domains (e.g. afternic.com).
Checks the HOST only (not the path), so afternic.com/forsale/reward.xyz is fine.
"""
from __future__ import annotations

import ipaddress
import re
from urllib.parse import urlparse

# brand keyword -> official domain. Impersonation = brand appears in the host but
# the registered domain is NOT the official one.
BRANDS = {
    "bkash": "bkash.com", "bikash": "bkash.com",
    "nagad": "nagad.com.bd",
    "rocket": "rocket.com.bd",
    "dbbl": "dutchbanglabank.com", "dutchbangla": "dutchbanglabank.com",
    "bracbank": "bracbank.com",
    "islamibank": "islamibankbd.com",
    "sonali": "sonalibank.com.bd",
    "citybank": "citybankplc.com",
    "paypal": "paypal.com", "payoneer": "payoneer.com",
    "google": "google.com", "facebook": "facebook.com",
    "instagram": "instagram.com", "whatsapp": "whatsapp.com",
    "amazon": "amazon.com", "netflix": "netflix.com",
    "microsoft": "microsoft.com", "apple": "apple.com",
    "binance": "binance.com",
}
SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "loan", "win", "bid",
    "click", "work", "zip", "mov", "country", "kim", "rest", "buzz",
}


def _host(url: str) -> str:
    u = url if re.match(r"^https?://", url, re.I) else "http://" + url
    h = (urlparse(u).hostname or "").lower()
    return h[4:] if h.startswith("www.") else h


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def analyze(url: str) -> dict | None:
    """Return {is_threat, confidence, reasons} for a URL, or None if nothing notable."""
    host = _host(url)
    if not host:
        return None

    reasons: list[str] = []
    score = 0
    tokens = set(re.split(r"[.\-]", host))   # host labels + hyphen parts

    if _is_ip(host):
        score += 3
        reasons.append("ডোমেইনের বদলে সরাসরি IP ঠিকানা")

    if "xn--" in host:
        score += 2
        reasons.append("Punycode (দেখতে আসল মনে হয় এমন) ডোমেইন")

    # Brand impersonation: brand token present, but registered domain isn't official
    for brand, official in BRANDS.items():
        if brand in tokens and not (host == official or host.endswith("." + official)):
            score += 3
            reasons.append(f"'{brand}' ব্র্যান্ড অনুকরণ — এটি আসল {official} নয়")
            break

    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    if tld in SUSPICIOUS_TLDS:
        score += 1
        reasons.append(f".{tld} — সন্দেহজনক/সস্তা ডোমেইন এক্সটেনশন")

    if host.count("-") >= 2:
        score += 1
        reasons.append("ডোমেইনে অস্বাভাবিক হাইফেন")
    if host.count(".") >= 3:
        score += 1
        reasons.append("অস্বাভাবিক সংখ্যক সাবডোমেইন")

    if score < 3:
        return None  # not enough signal — let caller mark it "unverified"

    confidence = 0.85 if score >= 4 else 0.72
    return {"is_threat": True, "confidence": confidence, "reasons": reasons[:3]}
