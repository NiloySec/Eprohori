"""
Ensemble Classifier - Combine multiple models for higher accuracy

Combines:
- Zero-Shot (30% weight)
- Groq LLaMA (40% weight)
- Gemini (20% weight)
- Rule-based (10% weight)

Expected accuracy: 70% → 80%+
"""

import asyncio
import json
from typing import Dict, Any, Optional
from datetime import datetime
import numpy as np

from zero_shot_classifier import classify_threat_zero_shot
from multi_model_analyzer import analyze_with_groq, analyze_with_gemini, _return_best_effort


class EnsembleClassifier:
    """Weighted ensemble of multiple threat classification models"""

    # Model weights (must sum to 1.0)
    WEIGHTS = {
        "zero_shot": 0.30,
        "groq": 0.40,
        "gemini": 0.20,
        "fallback": 0.10
    }

    # Confidence thresholds
    MIN_CONFIDENCE = 0.3
    HIGH_CONFIDENCE = 0.85

    @staticmethod
    def normalize_confidence(conf: float) -> float:
        """Normalize confidence to 0-1 range"""
        return max(0.0, min(1.0, float(conf)))

    @staticmethod
    def threat_to_vector(threat_type: str) -> Dict[str, float]:
        """Convert threat type to weighted vector"""
        threat_map = {
            "Phishing": 0,
            "Scam": 1,
            "Malware": 2,
            "Fraud": 3,
            "Harassment": 4,
            "Other": 5,
            "Unknown": 5
        }
        threat_idx = threat_map.get(threat_type, 5)

        # Create one-hot-like vector
        vector = {
            "Phishing": 0.0,
            "Scam": 0.0,
            "Malware": 0.0,
            "Fraud": 0.0,
            "Harassment": 0.0,
            "Other": 0.0
        }

        if threat_type in vector:
            vector[threat_type] = 1.0

        return vector

    @classmethod
    async def classify_ensemble(
        cls,
        text: str,
        language: str = "en",
        use_groq: bool = True,
        use_gemini: bool = True
    ) -> Dict[str, Any]:
        """
        Classify using ensemble of models

        Returns:
        {
            "threat_type": str,
            "confidence": float (0-1),
            "severity": str,
            "models_used": [str],
            "model_scores": {model: score},
            "description": str,
            "solution_steps": [str],
            "prevention_tips": [str]
        }
        """

        results = {}
        model_scores = {}

        # Model 1: Zero-Shot (fast, always available)
        try:
            zero_shot = await classify_threat_zero_shot(text)
            if zero_shot and zero_shot.get("threat_type"):
                results["zero_shot"] = {
                    "threat_type": zero_shot.get("threat_type", "Unknown"),
                    "confidence": cls.normalize_confidence(zero_shot.get("confidence", 0.5)),
                    "source": "zero_shot"
                }
                model_scores["zero_shot"] = zero_shot.get("confidence", 0.5)
        except Exception as e:
            print(f"[ensemble] Zero-shot error: {e}")

        # Model 2: Groq LLaMA (if available)
        if use_groq:
            try:
                groq_result = await analyze_with_groq(text, language)
                if groq_result and groq_result.get("threat_type"):
                    results["groq"] = {
                        "threat_type": groq_result.get("threat_type", "Unknown"),
                        "confidence": cls.normalize_confidence(groq_result.get("confidence", 0.5)),
                        "source": "groq"
                    }
                    model_scores["groq"] = groq_result.get("confidence", 0.5)
            except Exception as e:
                print(f"[ensemble] Groq error: {e}")

        # Model 3: Gemini (if available)
        if use_gemini:
            try:
                gemini_result = await analyze_with_gemini(text, language)
                if gemini_result and gemini_result.get("threat_type"):
                    results["gemini"] = {
                        "threat_type": gemini_result.get("threat_type", "Unknown"),
                        "confidence": cls.normalize_confidence(gemini_result.get("confidence", 0.5)),
                        "source": "gemini"
                    }
                    model_scores["gemini"] = gemini_result.get("confidence", 0.5)
            except Exception as e:
                print(f"[ensemble] Gemini error: {e}")

        # Model 4: Fallback/Rule-based (always available)
        try:
            fallback = _return_best_effort(text, language)
            if fallback:
                results["fallback"] = {
                    "threat_type": fallback.get("threat_type", "Unknown"),
                    "confidence": cls.normalize_confidence(fallback.get("confidence", 0.5)),
                    "source": "fallback"
                }
                model_scores["fallback"] = fallback.get("confidence", 0.5)
        except Exception as e:
            print(f"[ensemble] Fallback error: {e}")

        # Weighted voting
        threat_scores = {}
        models_used = list(results.keys())

        for model_name, result in results.items():
            threat = result.get("threat_type", "Unknown")
            conf = result.get("confidence", 0.5)
            weight = cls.WEIGHTS.get(model_name, 0.1)

            if threat not in threat_scores:
                threat_scores[threat] = 0.0

            weighted_score = conf * weight
            threat_scores[threat] += weighted_score

        # Get best threat
        if threat_scores:
            best_threat = max(threat_scores.items(), key=lambda x: x[1])
            final_threat_type = best_threat[0]
            final_confidence = best_threat[1]
        else:
            final_threat_type = "Unknown"
            final_confidence = 0.5

        # Normalize final confidence (weighted sum might exceed 1.0)
        final_confidence = min(1.0, final_confidence)

        # Determine severity based on threat type
        severity_map = {
            "Phishing": "High",
            "Malware": "Critical",
            "Fraud": "High",
            "Scam": "Medium",
            "Harassment": "Medium",
            "Unknown": "Low"
        }
        severity = severity_map.get(final_threat_type, "Low")

        # Boost severity if confidence is high
        if final_confidence > cls.HIGH_CONFIDENCE and severity == "Medium":
            severity = "High"

        # Get threat description
        threat_descriptions = {
            "Phishing": "Fraudulent attempt to steal credentials or personal information",
            "Scam": "Deceptive scheme to gain money or valuables",
            "Malware": "Malicious software designed to harm your device",
            "Fraud": "Illegal activity to deceive and gain unauthorized access",
            "Harassment": "Unwanted communication causing distress",
            "Unknown": "Potential threat - analysis uncertain"
        }
        description = threat_descriptions.get(final_threat_type, "Unknown threat")

        # Get solution steps
        def get_solutions(threat_type: str) -> list:
            solutions = {
                "Phishing": [
                    "Do NOT click any links or download attachments",
                    "Report the email to the sender's organization",
                    "Delete the message immediately"
                ],
                "Scam": [
                    "Do NOT send any money or personal information",
                    "Block the sender/number",
                    "Report to authorities if money was already sent"
                ],
                "Malware": [
                    "Disconnect from internet immediately",
                    "Run antivirus scan",
                    "If critical, backup data and reinstall OS"
                ],
                "Fraud": [
                    "Contact your bank/service provider immediately",
                    "Monitor your accounts for unauthorized activity",
                    "Consider freezing credit"
                ],
                "Harassment": [
                    "Block the sender",
                    "Save evidence of harassment",
                    "Report to platform or authorities"
                ],
                "Unknown": [
                    "Be cautious with this message",
                    "Verify before clicking any links",
                    "Consult with IT security if needed"
                ]
            }
            return solutions.get(threat_type, ["Be cautious with this message"])

        solution_steps = get_solutions(final_threat_type)

        # Get prevention tips
        def get_prevention(threat_type: str) -> list:
            prevention = {
                "Phishing": [
                    "Check sender's email address carefully",
                    "Enable two-factor authentication",
                    "Use password managers"
                ],
                "Scam": [
                    "Never trust unsolicited offers",
                    "Verify requests through official channels",
                    "Educate family about common scams"
                ],
                "Malware": [
                    "Keep software updated",
                    "Use antivirus software",
                    "Avoid downloading from untrusted sources"
                ],
                "Fraud": [
                    "Use strong, unique passwords",
                    "Monitor bank statements regularly",
                    "Enable account notifications"
                ],
                "Harassment": [
                    "Block unwanted contacts",
                    "Don't engage with harassers",
                    "Report patterns of harassment"
                ],
                "Unknown": [
                    "Stay alert and informed",
                    "Verify sources before trusting",
                    "Keep security software updated"
                ]
            }
            return prevention.get(threat_type, ["Be cautious online"])

        prevention_tips = get_prevention(final_threat_type)

        return {
            "threat_type": final_threat_type,
            "severity": severity,
            "confidence": round(final_confidence, 2),
            "models_used": models_used,
            "model_count": len(models_used),
            "model_scores": model_scores,
            "description": description,
            "solution_steps": solution_steps,
            "prevention_tips": prevention_tips,
            "timestamp": datetime.utcnow().isoformat(),
            "ensemble_score": round(final_confidence, 3)
        }


# Async wrapper for sync usage
async def classify_ensemble(
    text: str,
    language: str = "en",
    use_groq: bool = True,
    use_gemini: bool = True
) -> Dict[str, Any]:
    """Classify using ensemble - async version"""
    return await EnsembleClassifier.classify_ensemble(
        text,
        language,
        use_groq,
        use_gemini
    )


# Sync wrapper
def classify_ensemble_sync(
    text: str,
    language: str = "en",
    use_groq: bool = True,
    use_gemini: bool = True
) -> Dict[str, Any]:
    """Classify using ensemble - sync version"""
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        EnsembleClassifier.classify_ensemble(
            text,
            language,
            use_groq,
            use_gemini
        )
    )
