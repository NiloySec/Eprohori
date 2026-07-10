"""
Data Breach Monitor - Checks if email or phone exists in known data breaches.
Uses HaveIBeenPwned API (or similar mock for now).
"""

import os
import httpx
import hashlib
from typing import List, Dict, Any

HIBP_API_KEY = os.getenv("HIBP_API_KEY")

async def check_breach(identifier: str) -> Dict[str, Any]:
    """
    Check if an email or phone number has been pwned.
    Identifier can be email or phone.
    """
    # For phone numbers, we usually need a specific API or format.
    # This is a robust mock that returns real-looking data if no API key is set.

    if not HIBP_API_KEY:
        # Mock logic for demonstration/development
        # Deterministic mock based on identifier string
        seed = int(hashlib.md5(identifier.encode()).hexdigest(), 16)
        is_pwned = seed % 3 == 0

        if not is_pwned:
            return {"is_pwned": False, "breach_count": 0, "sources": []}

        return {
            "is_pwned": True,
            "breach_count": seed % 5 + 1,
            "sources": [
                {"name": "Facebook 2019 Leak", "date": "2019-04-01", "data": "Phone numbers, Names"},
                {"name": "LinkedIn Data Scraping", "date": "2021-06-22", "data": "Email, Job titles"}
            ][:seed % 2 + 1],
            "recommendation": "আপনার পাসওয়ার্ড দ্রুত পরিবর্তন করুন এবং ২-ফ্যাক্টর অথেন্টিকেশন চালু করুন।"
        }

    # Real API integration placeholder
    async with httpx.AsyncClient() as client:
        try:
            # HIBP requires an API key for email lookups
            headers = {"hibp-api-key": HIBP_API_KEY, "user-agent": "EProhori-App"}
            resp = await client.get(f"https://haveibeenpwned.com/api/v3/breachedaccount/{identifier}", headers=headers)

            if resp.status_code == 404:
                return {"is_pwned": False, "breach_count": 0, "sources": []}

            data = resp.json()
            return {
                "is_pwned": True,
                "breach_count": len(data),
                "sources": [{"name": b["Name"], "date": b["BreachDate"], "data": b["DataClasses"]} for b in data],
                "recommendation": "আপনার তথ্য ইন্টারনেটে লিক হয়েছে। দ্রুত নিরাপত্তা ব্যবস্থা গ্রহণ করুন।"
            }
        except Exception:
            return {"is_pwned": False, "error": "Breach check temporarily unavailable"}
