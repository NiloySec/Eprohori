"""
Advanced Text Preprocessing - Clean and extract features for better ML

Improves accuracy through:
- URL/email extraction
- Phone number normalization
- Special character handling
- Feature engineering
"""

import re
import unicodedata
from typing import Dict, Any, Tuple


class AdvancedPreprocessor:
    """Advanced text preprocessing for threat detection"""

    @staticmethod
    def normalize_unicode(text: str) -> str:
        """Normalize unicode characters"""
        try:
            # NFD normalization
            text = unicodedata.normalize('NFD', text)
            # Encode to ASCII, ignoring non-ASCII
            text = text.encode('ascii', 'ignore').decode('utf-8')
            return text
        except Exception as e:
            print(f"[preprocess] Unicode normalization error: {e}")
            return text

    @staticmethod
    def extract_and_normalize_urls(text: str) -> Tuple[str, list]:
        """Extract URLs and replace with placeholders"""
        urls = re.findall(r'https?://[^\s]+', text)
        cleaned = text

        for url in urls:
            try:
                # Extract domain
                domain = url.split('/')[2]
                # Replace with placeholder
                cleaned = cleaned.replace(url, f"[URL:{domain}]")
            except IndexError:
                cleaned = cleaned.replace(url, "[URL]")

        return cleaned, urls

    @staticmethod
    def extract_and_normalize_emails(text: str) -> Tuple[str, list]:
        """Extract emails and replace with domain placeholders"""
        emails = re.findall(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            text
        )
        cleaned = text

        for email in emails:
            try:
                domain = email.split('@')[1]
                cleaned = cleaned.replace(email, f"[EMAIL:{domain}]")
            except IndexError:
                cleaned = cleaned.replace(email, "[EMAIL]")

        return cleaned, emails

    @staticmethod
    def extract_and_normalize_phones(text: str) -> Tuple[str, list]:
        """Extract phone numbers and replace with placeholders"""
        phone_patterns = [
            r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
            r'\+\d{1,3}\s\d{1,14}',
            r'\b\d{10,14}\b',
        ]

        phones = []
        cleaned = text

        for pattern in phone_patterns:
            matches = re.findall(pattern, text)
            phones.extend(matches)
            cleaned = re.sub(pattern, "[PHONE]", cleaned)

        return cleaned, phones

    @staticmethod
    def normalize_numbers(text: str) -> str:
        """Replace numbers with placeholders"""
        return re.sub(r'\d+', '[NUM]', text)

    @staticmethod
    def normalize_whitespace(text: str) -> str:
        """Normalize whitespace"""
        return ' '.join(text.split())

    @staticmethod
    def remove_special_chars(text: str, keep_chars: str = "-_.[]") -> str:
        """Remove special characters but keep important ones"""
        pattern = f'[^a-z0-9\\s{re.escape(keep_chars)}]'
        return re.sub(pattern, '', text.lower())

    @staticmethod
    def detect_urgent_keywords(text: str) -> Dict[str, bool]:
        """Detect threat-related keywords"""
        text_lower = text.lower()

        keywords = {
            "urgent": bool(re.search(r'urgent|immediately|asap|now', text_lower)),
            "verification": bool(re.search(r'verify|confirm|validate', text_lower)),
            "password": bool(re.search(r'password|pin|otp|code', text_lower)),
            "money": bool(re.search(r'money|payment|transfer|send|wire', text_lower)),
            "account": bool(re.search(r'account|login|access|locked', text_lower)),
            "claim": bool(re.search(r'claim|prize|win|reward|congratulation', text_lower)),
            "link": bool(re.search(r'click|link|visit|open', text_lower)),
            "download": bool(re.search(r'download|attachment|file|install', text_lower)),
        }

        return keywords

    @staticmethod
    def extract_features(text: str) -> Dict[str, Any]:
        """Extract ML features from text"""
        text_lower = text.lower()

        features = {
            # Text statistics
            "length": len(text),
            "word_count": len(text.split()),
            "char_count": len(text),
            "average_word_length": len(text) / max(1, len(text.split())),

            # Character composition
            "uppercase_ratio": sum(1 for c in text if c.isupper()) / max(1, len(text)),
            "digit_ratio": sum(1 for c in text if c.isdigit()) / max(1, len(text)),
            "special_char_count": sum(1 for c in text if not c.isalnum() and c != ' '),
            "special_char_ratio": sum(1 for c in text if not c.isalnum() and c != ' ') / max(1, len(text)),

            # Threat indicators
            "has_url": bool(re.search(r'https?://', text)),
            "url_count": len(re.findall(r'https?://', text)),
            "has_email": bool(re.search(r'\S+@\S+', text)),
            "email_count": len(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)),
            "has_phone": bool(re.search(r'[\d\-\+\(\)]{8,}', text)),
            "phone_count": len(re.findall(r'[\d\-\+\(\)]{8,}', text)),

            # Punctuation
            "exclamation_count": text.count('!'),
            "question_count": text.count('?'),
            "exclamation_ratio": text.count('!') / max(1, len(text.split())),

            # Repeated characters
            "repeated_chars": len(re.findall(r'(.)\1{2,}', text)),

            # Keyword presence
            **AdvancedPreprocessor.detect_urgent_keywords(text)
        }

        return features

    @staticmethod
    def preprocess(text: str, language: str = "en") -> Dict[str, Any]:
        """Complete preprocessing pipeline"""
        try:
            # Step 1: Normalize unicode
            text = AdvancedPreprocessor.normalize_unicode(text)

            # Step 2: Extract URLs, emails, phones
            text, urls = AdvancedPreprocessor.extract_and_normalize_urls(text)
            text, emails = AdvancedPreprocessor.extract_and_normalize_emails(text)
            text, phones = AdvancedPreprocessor.extract_and_normalize_phones(text)

            # Step 3: Normalize numbers
            text = AdvancedPreprocessor.normalize_numbers(text)

            # Step 4: Normalize whitespace
            text = AdvancedPreprocessor.normalize_whitespace(text)

            # Step 5: Convert to lowercase
            text = text.lower()

            # Step 6: Remove special characters
            text = AdvancedPreprocessor.remove_special_chars(text)

            # Step 7: Extract features
            features = AdvancedPreprocessor.extract_features(text)

            return {
                "cleaned_text": text,
                "original_text": text,  # For reference
                "urls": urls,
                "emails": emails,
                "phones": phones,
                "features": features,
                "url_count": len(urls),
                "email_count": len(emails),
                "phone_count": len(phones),
                "has_contact_info": len(urls) + len(emails) + len(phones) > 0
            }

        except Exception as e:
            print(f"[preprocess] Error: {e}")
            return {
                "cleaned_text": text,
                "original_text": text,
                "urls": [],
                "emails": [],
                "phones": [],
                "features": AdvancedPreprocessor.extract_features(text),
                "error": str(e)
            }


# Convenience functions
def preprocess_text(text: str, language: str = "en") -> Dict[str, Any]:
    """Preprocess text and extract features"""
    return AdvancedPreprocessor.preprocess(text, language)


def extract_features(text: str) -> Dict[str, Any]:
    """Extract ML features from text"""
    return AdvancedPreprocessor.extract_features(text)
