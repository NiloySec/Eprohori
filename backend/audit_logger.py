"""
Audit Logging - Track all important actions for compliance and debugging

Logs:
- User authentication (login, logout, password change)
- Report actions (create, approve, reject, delete)
- Admin actions (broadcast, user ban, data export)
- Data access (large exports, sensitive data requests)
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Session
import json


# Add to models.py:
class AuditLog:
    """
    Audit trail for compliance and debugging

    Fields:
    - id: unique audit log ID
    - user_id: who performed the action
    - action: what action (login, report_create, admin_broadcast, etc.)
    - resource_type: what was affected (threat, user, alert, etc.)
    - resource_id: ID of affected resource
    - timestamp: when it happened
    - details: JSON details of the action
    - ip_address: source IP address
    - user_agent: browser/client info
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String)  # e.g., "login", "report_create", "admin_approve"
    resource_type = Column(String)  # e.g., "threat", "user", "alert"
    resource_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    details = Column(JSON)  # Custom action details
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    def __repr__(self):
        return f"<AuditLog {self.action} on {self.resource_type}:{self.resource_id}>"


# Audit logger helper class
class AuditLogger:
    """Helper to log audit events"""

    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[int],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """
        Log an audit event

        Example:
            AuditLogger.log_action(
                db=db,
                user_id=user.id,
                action="report_create",
                resource_type="threat",
                resource_id=str(threat.id),
                details={"threat_type": "phishing", "source": "sms"},
                ip_address="192.168.1.1"
            )
        """
        try:
            from database import Base  # Avoid circular import
            from models import AuditLog as AuditLogModel

            audit_log = AuditLogModel(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details or {},
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            print(f"[audit] Failed to log action: {e}")
            db.rollback()

    @staticmethod
    def log_login(db: Session, user_id: int, ip_address: str, user_agent: str) -> None:
        """Log user login"""
        AuditLogger.log_action(
            db=db,
            user_id=user_id,
            action="login",
            resource_type="auth",
            details={"event": "successful_login"},
            ip_address=ip_address,
            user_agent=user_agent
        )

    @staticmethod
    def log_report_created(db: Session, user_id: int, threat_id: int) -> None:
        """Log threat report creation"""
        AuditLogger.log_action(
            db=db,
            user_id=user_id,
            action="report_create",
            resource_type="threat",
            resource_id=str(threat_id)
        )

    @staticmethod
    def log_admin_action(
        db: Session,
        admin_id: int,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Dict[str, Any]
    ) -> None:
        """Log admin action"""
        AuditLogger.log_action(
            db=db,
            user_id=admin_id,
            action=f"admin_{action}",
            resource_type=resource_type,
            resource_id=resource_id,
            details=details
        )


# Usage in main.py:
"""
from audit_logger import AuditLogger

@app.post("/api/auth/login")
def login(email: str, password: str, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(email, password)
    if user:
        AuditLogger.log_login(
            db=db,
            user_id=user.id,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent", "")
        )
    return {"token": create_token(user)}

@app.post("/api/threats")
def create_threat(threat: ThreatCreate, request: Request, db: Session = Depends(get_db), user = Depends(require_user)):
    threat_obj = Threat(**threat.dict())
    db.add(threat_obj)
    db.commit()

    AuditLogger.log_report_created(
        db=db,
        user_id=user.id,
        threat_id=threat_obj.id
    )

    return threat_obj
"""
