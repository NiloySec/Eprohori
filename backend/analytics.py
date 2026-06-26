"""
Analytics Module - Track and report platform metrics

Provides:
- Threat trend analysis
- User engagement metrics
- Geographic distribution
- Alert effectiveness
- System performance metrics
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any
import json


class Analytics:
    """Analytics engine for EProhori platform"""

    @staticmethod
    def get_threat_trends(db: Session, days: int = 30) -> Dict[str, Any]:
        """Get threat trends over time period"""
        from models import Threat

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Daily threat count
        daily_threats = db.query(
            func.date(Threat.created_at).label('date'),
            func.count(Threat.id).label('count')
        ).filter(
            Threat.created_at >= cutoff_date
        ).group_by(
            func.date(Threat.created_at)
        ).order_by('date').all()

        # Threat type distribution
        threat_types = db.query(
            Threat.threat_type,
            func.count(Threat.id).label('count')
        ).filter(
            Threat.created_at >= cutoff_date
        ).group_by(Threat.threat_type).all()

        return {
            'period_days': days,
            'daily_trends': [
                {'date': str(t[0]), 'count': t[1]} for t in daily_threats
            ],
            'threat_types': [
                {'type': t[0], 'count': t[1]} for t in threat_types
            ],
            'total_threats': sum(t[1] for t in daily_threats),
            'average_per_day': sum(t[1] for t in daily_threats) / days if daily_threats else 0
        }

    @staticmethod
    def get_geographic_distribution(db: Session) -> Dict[str, Any]:
        """Get threat distribution by district/geography"""
        from models import Threat, District

        threats_by_district = db.query(
            Threat.district,
            func.count(Threat.id).label('count')
        ).group_by(Threat.district).all()

        return {
            'distribution': [
                {'district': t[0], 'count': t[1]} for t in threats_by_district
            ],
            'total_districts_affected': len(threats_by_district),
            'highest_risk_district': max(
                threats_by_district, key=lambda x: x[1]
            )[0] if threats_by_district else None
        }

    @staticmethod
    def get_user_engagement(db: Session, days: int = 30) -> Dict[str, Any]:
        """Get user engagement metrics"""
        from models import User, Threat, Alert

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Active users
        active_users = db.query(
            func.count(func.distinct(Threat.user_id))
        ).filter(
            Threat.created_at >= cutoff_date
        ).scalar()

        # Top reporters
        top_reporters = db.query(
            User.username,
            func.count(Threat.id).label('report_count')
        ).join(
            Threat
        ).filter(
            Threat.created_at >= cutoff_date
        ).group_by(User.id).order_by(
            func.count(Threat.id).desc()
        ).limit(10).all()

        # User tier distribution
        tier_distribution = db.query(
            User.tier,
            func.count(User.id).label('count')
        ).group_by(User.tier).all()

        return {
            'active_users': active_users,
            'total_users': db.query(func.count(User.id)).scalar(),
            'top_reporters': [
                {'username': t[0], 'reports': t[1]} for t in top_reporters
            ],
            'tier_distribution': [
                {'tier': t[0], 'count': t[1]} for t in tier_distribution
            ]
        }

    @staticmethod
    def get_alert_effectiveness(db: Session, days: int = 30) -> Dict[str, Any]:
        """Get alert delivery and effectiveness metrics"""
        from models import Alert, AlertStatus

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        total_alerts = db.query(func.count(Alert.id)).filter(
            Alert.created_at >= cutoff_date
        ).scalar()

        # Alert status breakdown
        status_breakdown = db.query(
            Alert.status,
            func.count(Alert.id).label('count')
        ).filter(
            Alert.created_at >= cutoff_date
        ).group_by(Alert.status).all()

        # Average alert delivery time
        avg_delivery_time = db.query(
            func.avg(Alert.delivered_at - Alert.created_at)
        ).filter(
            Alert.created_at >= cutoff_date,
            Alert.delivered_at.isnot(None)
        ).scalar()

        return {
            'period_days': days,
            'total_alerts': total_alerts,
            'status_breakdown': [
                {'status': s[0], 'count': s[1]} for s in status_breakdown
            ],
            'avg_delivery_time_seconds': avg_delivery_time.total_seconds() if avg_delivery_time else 0,
            'delivery_rate': (
                sum(s[1] for s in status_breakdown if s[0] == 'delivered') / total_alerts
                if total_alerts > 0 else 0
            )
        }

    @staticmethod
    def get_system_health(db: Session) -> Dict[str, Any]:
        """Get system health and performance metrics"""
        from models import Threat, User, Alert

        return {
            'total_threats': db.query(func.count(Threat.id)).scalar(),
            'total_users': db.query(func.count(User.id)).scalar(),
            'total_alerts_sent': db.query(func.count(Alert.id)).scalar(),
            'pending_reports': db.query(func.count(Threat.id)).filter(
                Threat.status == 'pending'
            ).scalar(),
            'verified_threats': db.query(func.count(Threat.id)).filter(
                Threat.status == 'verified'
            ).scalar(),
            'last_update': datetime.utcnow().isoformat()
        }

    @staticmethod
    def get_threat_source_distribution(db: Session, days: int = 30) -> Dict[str, Any]:
        """Get threats by source (SMS, Email, Website, etc.)"""
        from models import Threat

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        sources = db.query(
            Threat.platform,
            func.count(Threat.id).label('count')
        ).filter(
            Threat.created_at >= cutoff_date
        ).group_by(Threat.platform).all()

        return {
            'sources': [
                {'platform': s[0], 'count': s[1]} for s in sources
            ],
            'primary_source': max(sources, key=lambda x: x[1])[0] if sources else None
        }


# API Endpoints (add to main.py):
"""
from analytics import Analytics

@app.get("/api/admin/analytics/trends")
def get_trends(days: int = 30, db: Session = Depends(get_db)):
    \"\"\"Get threat trends\"\"\"
    return Analytics.get_threat_trends(db, days)

@app.get("/api/admin/analytics/geographic")
def get_geographic(db: Session = Depends(get_db)):
    \"\"\"Get geographic distribution\"\"\"
    return Analytics.get_geographic_distribution(db)

@app.get("/api/admin/analytics/engagement")
def get_engagement(days: int = 30, db: Session = Depends(get_db)):
    \"\"\"Get user engagement metrics\"\"\"
    return Analytics.get_user_engagement(db, days)

@app.get("/api/admin/analytics/alerts")
def get_alerts(days: int = 30, db: Session = Depends(get_db)):
    \"\"\"Get alert effectiveness\"\"\"
    return Analytics.get_alert_effectiveness(db, days)

@app.get("/api/admin/analytics/health")
def get_health(db: Session = Depends(get_db)):
    \"\"\"Get system health\"\"\"
    return Analytics.get_system_health(db)

@app.get("/api/admin/analytics/sources")
def get_sources(days: int = 30, db: Session = Depends(get_db)):
    \"\"\"Get threat source distribution\"\"\"
    return Analytics.get_threat_source_distribution(db, days)
"""
