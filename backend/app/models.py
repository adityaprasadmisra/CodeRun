import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    join_date = Column(DateTime(timezone=True), server_default=func.now())

    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(20), nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String(30), nullable=False)  # Success, Compile Error, Runtime Error, Timeout
    output = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    memory_usage_kb = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="submissions")
    report = relationship("Report", uselist=False, back_populates="submission", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    submission_id = Column(String(50), ForeignKey("submissions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    engineering_score = Column(Integer, nullable=False)
    
    # Complexity
    time_complexity = Column(String(50), nullable=False)
    space_complexity = Column(String(50), nullable=False)
    complexity_reasoning = Column(Text, nullable=False)
    
    # Optimization
    current_approach = Column(Text, nullable=True)
    optimal_approach = Column(Text, nullable=True)
    optimization_suggestions = Column(JSON, nullable=True)  # List of strings
    
    # Code Quality
    readability_score = Column(Integer, nullable=False)
    maintainability_score = Column(Integer, nullable=False)
    best_practices_score = Column(Integer, nullable=False)
    code_quality_suggestions = Column(JSON, nullable=True)  # List of strings
    
    # Potential Risks
    bug_analysis = Column(Text, nullable=True)
    edge_cases = Column(Text, nullable=True)
    security_issues = Column(Text, nullable=True)
    
    # Learning
    concepts_used = Column(JSON, nullable=True)             # List of strings
    weak_areas = Column(JSON, nullable=True)                # List of strings
    suggested_topics = Column(JSON, nullable=True)          # List of strings
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submission = relationship("Submission", back_populates="report")
