from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Create database engine with fallback to SQLite
try:
    engine = create_engine(settings.DATABASE_URL, connect_args={"connect_timeout": 3})
    # Force a quick connection test
    with engine.connect() as conn:
        pass
    print("Database: Connected to PostgreSQL successfully.")
except Exception as e:
    print(f"Warning: PostgreSQL connection failed ({e}). Falling back to local SQLite database.")
    # In SQLite, we need to allow multithreading access
    sqlite_url = "sqlite:///./coderun_local.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class
Base = declarative_base()

# Dependency to get db session in endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
