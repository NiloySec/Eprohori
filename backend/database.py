import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Production: Railway injects DATABASE_URL for the Postgres plugin.
# Local dev: falls back to SQLite file.
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./eprohori.db")

# Railway sometimes provides `postgres://` — SQLAlchemy 2.x needs `postgresql://`
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

if DB_URL.startswith("sqlite"):
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=300)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
