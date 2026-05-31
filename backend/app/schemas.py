from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    name: str
    join_date: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

# Report Schemas
class ReportResponse(BaseModel):
    id: UUID
    submission_id: UUID
    engineering_score: int
    time_complexity: str
    space_complexity: str
    complexity_reasoning: str
    current_approach: Optional[str] = None
    optimal_approach: Optional[str] = None
    optimization_suggestions: Optional[List[str]] = None
    readability_score: int
    maintainability_score: int
    best_practices_score: int
    code_quality_suggestions: Optional[List[str]] = None
    bug_analysis: Optional[str] = None
    edge_cases: Optional[str] = None
    security_issues: Optional[str] = None
    concepts_used: Optional[List[str]] = None
    weak_areas: Optional[List[str]] = None
    suggested_topics: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Submission Schemas
class SubmissionCreate(BaseModel):
    code: str
    language: str = Field(..., pattern="^(c|cpp|python|java)$")
    stdin: Optional[str] = ""

class SubmissionResponse(BaseModel):
    id: UUID
    user_id: UUID
    language: str
    code: str
    status: str
    output: Optional[str] = None
    error: Optional[str] = None
    execution_time_ms: Optional[int] = None
    memory_usage_kb: Optional[int] = None
    created_at: datetime
    report: Optional[ReportResponse] = None

    class Config:
        from_attributes = True

class SubmissionHistoryResponse(BaseModel):
    id: UUID
    language: str
    status: str
    execution_time_ms: Optional[int] = None
    memory_usage_kb: Optional[int] = None
    created_at: datetime
    engineering_score: Optional[int] = None

    class Config:
        from_attributes = True

# Dashboard / Analytics Schemas
class DashboardAnalytics(BaseModel):
    total_runs: int
    languages_used: Dict[str, int]
    average_engineering_score: float
    average_complexity: Dict[str, float]  # E.g. {"O(1)": 10, "O(N)": 15, "O(N^2)": 2}
    coding_improvement_trend: List[Dict[str, Any]] # List of {"date": "YYYY-MM-DD", "score": 85}
    recent_reports: List[SubmissionHistoryResponse]
