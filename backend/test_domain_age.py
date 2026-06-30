#!/usr/bin/env python3
"""
Test Layer 3: Domain Age Detection
Tests the WHOIS-based threat detection
"""

import asyncio
import os
import sys

# Add parent dir to path
sys.path.insert(0, os.path.dirname(__file__))

from multi_model_analyzer import _check_domain_age_layer

async def test_domain_age():
    """Test domain age checking with sample phishing URLs"""

    print("=" * 70)
    print("LAYER 3: DOMAIN AGE DETECTION TEST")
    print("=" * 70)
    print()

    test_cases = [
        {
            "name": "Old legitimate domain (should skip)",
            "url": "https://google.com",
            "expected": "No threat (old domain)"
        },
        {
            "name": "Recent domain (should flag)",
            "url": "https://paypal-verify-2025.com",
            "expected": "High/Critical threat"
        },
        {
            "name": "Text with URL",
            "text": "Click here to verify: https://amazon-account-verify.com",
            "expected": "High/Critical threat if new"
        },
        {
            "name": "No URL (should skip)",
            "text": "This is just regular text",
            "expected": "No threat"
        },
    ]

    for i, test in enumerate(test_cases, 1):
        print(f"Test {i}: {test['name']}")
        print(f"Expected: {test['expected']}")

        message = test.get('text') or test.get('url')
        print(f"Input: {message[:60]}...")

        try:
            result = await _check_domain_age_layer(message)

            if result:
                print(f"✅ DETECTED:")
                print(f"   Threat: {result.get('threat_type')}")
                print(f"   Severity: {result.get('severity')}")
                print(f"   Confidence: {result.get('confidence'):.0%}")
                print(f"   Domain age: {result.get('domain_age_days')} days")
                print(f"   Description: {result.get('description')}")
            else:
                print(f"⏭️  SKIPPED (domain too old or no URLs)")
        except Exception as e:
            print(f"❌ ERROR: {e}")

        print()

    print("=" * 70)
    print("LAYER 3 TEST COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(test_domain_age())
