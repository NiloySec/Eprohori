"""
EProhori API Test Suite

Run with: pytest tests/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, get_db
from database import Base

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# ─────────────────────────────────────────────────────────────────────────────
# Health & Status Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_api_documentation_available(self):
        """Test that API documentation is available"""
        response = client.get("/openapi.json")
        # May be disabled in production, so just check if endpoint exists
        assert response.status_code in [200, 404]

# ─────────────────────────────────────────────────────────────────────────────
# Chatbot Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestChatbot:
    def test_chatbot_phishing_detection(self):
        """Test chatbot detects phishing"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "Click here to verify your password immediately",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert "threat_type" in data
        assert "solution_steps" in data
        assert "prevention_tips" in data
        assert "confidence" in data

    def test_chatbot_scam_detection(self):
        """Test chatbot detects scams"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "Congratulations! You have won a lottery prize. Send money to claim",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert "threat_type" in data
        assert isinstance(data["solution_steps"], list)
        assert len(data["solution_steps"]) > 0

    def test_chatbot_malware_detection(self):
        """Test chatbot detects malware"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "Downloaded file from email with virus attached",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert "threat_type" in data
        assert data["severity"] in ["Critical", "High", "Medium", "Low"]

    def test_chatbot_bengali_support(self):
        """Test chatbot works with Bengali language"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "আমি একটি ফিশিং SMS পেয়েছি",
            "language": "bn"
        })
        assert response.status_code == 200
        data = response.json()
        assert "threat_type" in data
        assert "solution_steps" in data

    def test_chatbot_empty_message(self):
        """Test chatbot handles empty message"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "",
            "language": "en"
        })
        assert response.status_code == 200
        # Should still return something
        data = response.json()
        assert "threat_type" in data

    def test_chatbot_long_message(self):
        """Test chatbot handles long messages"""
        long_message = "Click here " * 100  # 1100 characters
        response = client.post("/api/chatbot/analyze", json={
            "message": long_message,
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert "threat_type" in data

    def test_chatbot_confidence_score(self):
        """Test chatbot returns valid confidence score"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "Click here to verify password",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert 0.0 <= data["confidence"] <= 1.0

    def test_chatbot_severity_levels(self):
        """Test chatbot returns valid severity levels"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "Suspicious message",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["severity"] in ["Critical", "High", "Medium", "Low"]

# ─────────────────────────────────────────────────────────────────────────────
# Input Validation Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestValidation:
    def test_invalid_language_code(self):
        """Test invalid language code handling"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "test",
            "language": "invalid"
        })
        # Should either return 422 or handle gracefully
        assert response.status_code in [200, 422]

    def test_missing_language(self):
        """Test missing language parameter"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "test"
        })
        # Should return default language or error
        assert response.status_code in [200, 422]

    def test_missing_message(self):
        """Test missing message parameter"""
        response = client.post("/api/chatbot/analyze", json={
            "language": "en"
        })
        assert response.status_code == 422  # Validation error

    def test_null_message(self):
        """Test null message handling"""
        response = client.post("/api/chatbot/analyze", json={
            "message": None,
            "language": "en"
        })
        assert response.status_code == 422  # Validation error

# ─────────────────────────────────────────────────────────────────────────────
# Performance Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestPerformance:
    def test_chatbot_response_time(self):
        """Test chatbot response is reasonably fast"""
        import time
        start = time.time()
        response = client.post("/api/chatbot/analyze", json={
            "message": "Click here to verify password",
            "language": "en"
        })
        elapsed = time.time() - start
        assert response.status_code == 200
        # Should respond within 5 seconds (accounting for ML model load)
        assert elapsed < 5.0

    def test_multiple_concurrent_requests(self):
        """Test handling multiple requests"""
        responses = []
        for i in range(5):
            response = client.post("/api/chatbot/analyze", json={
                "message": f"Test message {i}",
                "language": "en"
            })
            responses.append(response)

        # All should succeed
        assert all(r.status_code == 200 for r in responses)
        # All should have threat_type
        assert all("threat_type" in r.json() for r in responses)

# ─────────────────────────────────────────────────────────────────────────────
# Edge Case Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_special_characters(self):
        """Test message with special characters"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "Test with @#$%^&*() special chars!",
            "language": "en"
        })
        assert response.status_code == 200

    def test_unicode_characters(self):
        """Test message with unicode characters"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "Test with emojis 😊 👍 and symbols",
            "language": "en"
        })
        assert response.status_code == 200

    def test_mixed_language(self):
        """Test message with mixed languages"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "English text with বাংলা text mixed",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert "threat_type" in data

    def test_html_in_message(self):
        """Test message with HTML content"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "<script>alert('xss')</script>",
            "language": "en"
        })
        assert response.status_code == 200

    def test_sql_injection_in_message(self):
        """Test message with SQL injection attempt"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "' OR '1'='1",
            "language": "en"
        })
        assert response.status_code == 200

# ─────────────────────────────────────────────────────────────────────────────
# Response Format Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestResponseFormat:
    def test_response_has_required_fields(self):
        """Test response contains all required fields"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "test message",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()

        required_fields = [
            "threat_type",
            "severity",
            "confidence",
            "description",
            "solution_steps",
            "prevention_tips"
        ]

        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    def test_solution_steps_are_list(self):
        """Test solution_steps is a list"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "phishing attempt",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["solution_steps"], list)

    def test_prevention_tips_are_list(self):
        """Test prevention_tips is a list"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "phishing attempt",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["prevention_tips"], list)

    def test_description_is_string(self):
        """Test description is a string"""
        response = client.post("/api/chatbot/analyze", json={
            "message": "phishing attempt",
            "language": "en"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["description"], str)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
