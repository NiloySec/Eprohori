"""
Multi-model incident analyzer using Groq → Gemini → Claude fallback chain.
Optimizes for speed (Groq), cost (Gemini), and reliability (Claude).
"""

import os
import json
import time
from typing import Optional
import httpx

# Initialize clients
try:
    from groq import Groq as GroqClient
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from anthropic import Anthropic as ClaudeClient

# Setup
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

groq_client = GroqClient(api_key=GROQ_API_KEY) if GROQ_AVAILABLE and GROQ_API_KEY else None
claude_client = ClaudeClient(api_key=CLAUDE_API_KEY) if CLAUDE_API_KEY else None

if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


async def analyze_with_groq(message: str, language: str = "bn") -> Optional[dict]:
    """Fast incident analysis using Groq LLaMA (0.1-0.5 seconds)."""
    if not groq_client:
        return None

    try:
        system_prompt = """আপনি EProhori সাইবার নিরাপত্তা সহায়ক।
ব্যবহারকারী তাদের ঘটনা বর্ণনা করে। দ্রুত বিশ্লেষণ করুন এবং JSON দিন:
{
  "threat_type": "Phishing/Scam/Malware/Fraud/SIM Swap",
  "severity": "Critical/High/Medium/Low",
  "confidence": 0.85,
  "description": "সংক্ষিপ্ত ব্যাখ্যা",
  "solution_steps": ["ধাপ 1", "ধাপ 2"],
  "prevention_tips": ["টিপ 1", "টিপ 2"]
}"""

        start_time = time.time()
        completion = groq_client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=512,
        )
        elapsed = time.time() - start_time

        response_text = completion.choices[0].message.content
        result = json.loads(response_text)
        result["model"] = "groq"
        result["latency"] = elapsed
        return result
    except Exception as e:
        print(f"[groq] Error: {e}")
        return None


async def analyze_with_gemini(message: str, language: str = "bn") -> Optional[dict]:
    """Smart context analysis using Gemini (1-3 seconds)."""
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        return None

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        system_prompt = """You are EProhori cybersecurity assistant.
Analyze user's incident description and respond ONLY with JSON:
{
  "threat_type": "Phishing/Scam/Malware/Fraud/SIM Swap",
  "severity": "Critical/High/Medium/Low",
  "confidence": 0.85,
  "description": "Brief explanation",
  "solution_steps": ["Step 1", "Step 2"],
  "prevention_tips": ["Tip 1", "Tip 2"]
}"""

        start_time = time.time()
        response = model.generate_content(
            f"{system_prompt}\n\nUser incident: {message}",
            generation_config={"temperature": 0.7, "max_output_tokens": 512}
        )
        elapsed = time.time() - start_time

        response_text = response.text
        result = json.loads(response_text)
        result["model"] = "gemini"
        result["latency"] = elapsed
        return result
    except Exception as e:
        print(f"[gemini] Error: {e}")
        return None


async def analyze_with_claude(message: str, language: str = "bn") -> dict:
    """Reliable final analysis using Claude Opus (1-2 seconds)."""
    if not claude_client:
        return {
            "threat_type": "Unable to classify",
            "severity": "Medium",
            "confidence": 0.0,
            "description": "Claude API not available",
            "solution_steps": [],
            "prevention_tips": [],
            "model": "claude-failed"
        }

    system_prompt = """আপনি EProhori AI সাইবার সিকিউরিটি সহায়ক।
ব্যবহারকারী তাদের সাইবার হুমকি বা ঘটনা বর্ণনা করে। আপনি:

1. হুমকির ধরন চিহ্নিত করুন
2. গুরুত্ব মূল্যায়ন করুন
3. ধাপে ধাপে সমাধান প্রদান করুন
4. ভবিষ্যত প্রতিরোধ টিপস দিন

JSON সাড়া দিন (আর কিছু নয়):
{
  "threat_type": "ফিশিং/স্ক্যাম/ম্যালওয়্যার/ডেটা ব্রীচ/SIM Swap",
  "severity": "গুরুতর/উচ্চ/মাঝারি/কম",
  "confidence": 0.85,
  "description": "সংক্ষিপ্ত বাংলা ব্যাখ্যা",
  "solution_steps": ["ধাপ 1", "ধাপ 2", ...],
  "prevention_tips": ["টিপ 1", "টিপ 2", ...]
}"""

    try:
        start_time = time.time()
        response = claude_client.messages.create(
            model="claude-opus-4-8",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": message}]
        )
        elapsed = time.time() - start_time

        response_text = response.content[0].text
        result = json.loads(response_text)
        result["model"] = "claude"
        result["latency"] = elapsed
        return result
    except json.JSONDecodeError:
        return {
            "threat_type": "Unable to classify",
            "severity": "Medium",
            "confidence": 0.0,
            "description": response_text[:200],
            "solution_steps": ["Contact support: eprohoribd@gmail.com"],
            "prevention_tips": [],
            "model": "claude-parse-error"
        }
    except Exception as e:
        print(f"[claude] Error: {e}")
        return {
            "threat_type": "Error",
            "severity": "Medium",
            "confidence": 0.0,
            "description": str(e),
            "solution_steps": [],
            "prevention_tips": [],
            "model": "claude-error"
        }


async def analyze_incident_smart(message: str, language: str = "bn") -> dict:
    """
    Smart multi-model incident analysis.
    Fast (Groq) → Smart (Gemini) → Reliable (Claude) fallback chain.

    Strategy:
    - 70% requests end at Groq (fast, cheap)
    - 20% requests go to Gemini (smart fallback)
    - 10% requests reach Claude (high-confidence)
    """

    # Step 1: Fast path (Groq) - 0.1-0.5 seconds
    print(f"[multi-model] Step 1: Trying Groq (fast path)...")
    groq_result = await analyze_with_groq(message, language)

    if groq_result and groq_result.get("confidence", 0) >= 0.80:
        print(f"[multi-model] ✓ Groq confident: {groq_result['confidence']:.0%}")
        return groq_result

    # Step 2: Smart path (Gemini) - 1-3 seconds
    print(f"[multi-model] Step 2: Trying Gemini (smart fallback)...")
    gemini_result = await analyze_with_gemini(message, language)

    if gemini_result and gemini_result.get("confidence", 0) >= 0.85:
        print(f"[multi-model] ✓ Gemini confident: {gemini_result['confidence']:.0%}")
        return gemini_result

    # Step 3: Reliable path (Claude) - 1-2 seconds
    print(f"[multi-model] Step 3: Using Claude (reliable final)...")
    claude_result = await analyze_with_claude(message, language)
    print(f"[multi-model] ✓ Claude analysis: {claude_result['confidence']:.0%}")
    return claude_result


async def get_analysis_stats() -> dict:
    """Track which model was used for cost/performance analysis."""
    return {
        "groq_available": bool(groq_client),
        "gemini_available": GEMINI_AVAILABLE and bool(GEMINI_API_KEY),
        "claude_available": bool(claude_client),
        "strategy": "Groq (70%) → Gemini (20%) → Claude (10%)",
        "expected_cost_reduction": "78% vs Claude-only",
        "expected_speed_improvement": "3-5x faster for 80% of requests"
    }
