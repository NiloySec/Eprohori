"""
Load Testing with Locust

Run with: locust -f tests/test_load.py --host=http://localhost:8000

Metrics:
- Response time (p50, p95, p99)
- RPS (requests per second)
- Error rate
- Concurrent users
"""

from locust import HttpUser, task, between
import random


class EProhoriUser(HttpUser):
    """Simulates a typical EProhori user"""

    wait_time = between(1, 3)  # Wait 1-3 seconds between requests

    def on_start(self):
        """Setup tasks before user starts"""
        self.threat_messages = [
            "Click here to verify password",
            "Congratulations! You won a lottery prize",
            "Downloaded file with virus attached",
            "Send money to claim reward",
            "Verify your account immediately",
            "Update payment information now",
            "Your account has been compromised",
            "Confirm your identity to continue",
        ]

    @task(3)  # Weight: 3x more often than other tasks
    def chatbot_analyze(self):
        """Test chatbot analysis endpoint"""
        message = random.choice(self.threat_messages)
        language = random.choice(["en", "bn"])

        self.client.post(
            "/api/chatbot/analyze",
            json={
                "message": message,
                "language": language
            },
            name="/api/chatbot/analyze"
        )

    @task(2)
    def health_check(self):
        """Test health check endpoint"""
        self.client.get("/health", name="/health")

    @task(2)
    def get_stats(self):
        """Test statistics endpoint"""
        self.client.get("/api/stats", name="/api/stats")

    @task(1)
    def get_threats(self):
        """Test threats list endpoint"""
        self.client.get(
            "/api/threats?limit=10",
            name="/api/threats"
        )


class AdminUser(HttpUser):
    """Simulates an admin user"""

    wait_time = between(2, 5)

    def on_start(self):
        """Setup admin tasks"""
        # In real scenario, would login and get token
        self.headers = {"Authorization": "Bearer fake-token"}

    @task(2)
    def get_pending_reports(self):
        """Admin: get pending reports"""
        self.client.get(
            "/api/admin/threats/pending",
            headers=self.headers,
            name="/api/admin/threats/pending"
        )

    @task(1)
    def get_admin_stats(self):
        """Admin: get detailed statistics"""
        self.client.get(
            "/api/admin/stats",
            headers=self.headers,
            name="/api/admin/stats"
        )


# Load testing scenarios
class LowLoad(EProhoriUser):
    """
    Low load test: 10 concurrent users
    Expected:
    - RPS: 50-100
    - Response time: <100ms
    - Error rate: 0%
    """
    pass


class MediumLoad(EProhoriUser):
    """
    Medium load test: 100 concurrent users
    Expected:
    - RPS: 200-300
    - Response time: 100-200ms
    - Error rate: <1%
    """
    pass


class HighLoad(EProhoriUser):
    """
    High load test: 500 concurrent users
    Expected:
    - RPS: 500-1000
    - Response time: 200-500ms
    - Error rate: <5%
    """
    pass


class StressTest(EProhoriUser):
    """
    Stress test: 1000+ concurrent users
    Find breaking point
    """
    pass


# Custom locustfile for production testing:
"""
Command:
  locust -f tests/test_load.py --host=https://api.eprohori.tech -u 100 -r 10 -t 5m

Flags:
  -u: number of concurrent users (ramp up)
  -r: user spawn rate (users/second)
  -t: test duration
  --headless: run without web UI
  --csv=results: save results to CSV

Results Analysis:
  - p50 < 100ms: fast
  - p95 < 500ms: acceptable
  - p99 < 1000ms: borderline
  - Error rate < 1%: good
  - RPS > 1000: production ready
"""
