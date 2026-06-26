"""
Redis Caching Layer - Improve performance by caching hot data

Caches:
- Threat list (5 min)
- User XP/tier (10 min)
- Statistics (15 min)
- Blocklist (1 hour)
- Domain reputation (24 hours)
"""

import os
import json
import redis
from typing import Optional, Any, Callable
from functools import wraps
from datetime import datetime

# Redis connection
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = 0

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_keepalive=True
    )
    # Test connection
    redis_client.ping()
    REDIS_AVAILABLE = True
    print(f"✓ Redis connected ({REDIS_HOST}:{REDIS_PORT})")
except Exception as e:
    print(f"⚠️  Redis unavailable: {e}")
    redis_client = None
    REDIS_AVAILABLE = False


class CacheManager:
    """Manage Redis cache operations"""

    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get value from cache"""
        if not REDIS_AVAILABLE:
            return None
        try:
            value = redis_client.get(key)
            if value:
                try:
                    return json.loads(value)
                except:
                    return value
            return None
        except Exception as e:
            print(f"[cache] Get error: {e}")
            return None

    @staticmethod
    def set(key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Set value in cache with TTL"""
        if not REDIS_AVAILABLE:
            return False
        try:
            json_value = json.dumps(value) if not isinstance(value, str) else value
            redis_client.setex(key, ttl_seconds, json_value)
            return True
        except Exception as e:
            print(f"[cache] Set error: {e}")
            return False

    @staticmethod
    def delete(key: str) -> bool:
        """Delete key from cache"""
        if not REDIS_AVAILABLE:
            return False
        try:
            redis_client.delete(key)
            return True
        except Exception as e:
            print(f"[cache] Delete error: {e}")
            return False

    @staticmethod
    def clear_pattern(pattern: str) -> int:
        """Delete keys matching pattern (use with caution)"""
        if not REDIS_AVAILABLE:
            return 0
        try:
            keys = redis_client.keys(pattern)
            if keys:
                return redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"[cache] Clear pattern error: {e}")
            return 0


# Caching decorator for functions
def cache(ttl_seconds: int = 300, key_prefix: str = ""):
    """Decorator to cache function results"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            if not REDIS_AVAILABLE:
                return func(*args, **kwargs)

            # Build cache key
            cache_key = f"{key_prefix}:{func.__name__}"
            if args:
                cache_key += f":{':'.join(str(a) for a in args)}"
            if kwargs:
                cache_key += f":{':'.join(f'{k}={v}' for k,v in sorted(kwargs.items()))}"

            # Try to get from cache
            cached = CacheManager.get(cache_key)
            if cached is not None:
                return cached

            # Call function and cache result
            result = func(*args, **kwargs)
            CacheManager.set(cache_key, result, ttl_seconds)
            return result

        return wrapper
    return decorator


# Cache key constants
class CacheKey:
    """Standard cache key patterns"""
    THREATS_LIST = "threats:list"
    USER_XP = "user:xp:{user_id}"
    USER_TIER = "user:tier:{user_id}"
    STATS_OVERVIEW = "stats:overview"
    BLOCKLIST = "blocklist:all"
    DOMAIN_REPUTATION = "domain:reputation:{domain}"
    THREAT_COUNT = "threat:count:{status}"


# Usage examples:

"""
# In main.py

from cache import CacheManager, CacheKey, cache

# Manual caching
@app.get("/api/threats")
def get_threats(db: Session = Depends(get_db)):
    # Check cache first
    cached = CacheManager.get(CacheKey.THREATS_LIST)
    if cached:
        return cached

    # Get from DB
    threats = db.query(Threat).limit(100).all()
    result = [t.to_dict() for t in threats]

    # Cache for 5 minutes
    CacheManager.set(CacheKey.THREATS_LIST, result, 300)
    return result


# Decorator-based caching
@cache(ttl_seconds=600, key_prefix="user")
def get_user_xp(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    return {"xp": user.xp, "tier": user.tier}


# Cache invalidation
def on_threat_created(threat_id: int):
    # Invalidate threat list cache
    CacheManager.delete(CacheKey.THREATS_LIST)
    CacheManager.clear_pattern("threat:count:*")

def on_user_xp_changed(user_id: int):
    # Invalidate user cache
    CacheManager.delete(CacheKey.USER_XP.format(user_id=user_id))
    CacheManager.delete(CacheKey.USER_TIER.format(user_id=user_id))
"""


if __name__ == "__main__":
    # Test caching
    if REDIS_AVAILABLE:
        CacheManager.set("test:key", {"message": "Hello, Redis!"}, 60)
        value = CacheManager.get("test:key")
        print(f"Cached value: {value}")

        CacheManager.delete("test:key")
        print("Cache cleared")
    else:
        print("Redis is not available")
