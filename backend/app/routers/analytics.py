from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from ..database import get_db
from ..models import Submission, Report, User
from ..schemas import DashboardAnalytics, SubmissionHistoryResponse
from ..auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])

@router.get("", response_model=DashboardAnalytics)
def get_dashboard_analytics(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 1. Total Runs
    total_runs = db.query(Submission).filter(Submission.user_id == current_user.id).count()
    if total_runs == 0:
        return DashboardAnalytics(
            total_runs=0,
            languages_used={},
            average_engineering_score=0.0,
            average_complexity={},
            coding_improvement_trend=[],
            recent_reports=[]
        )

    # 2. Languages Used
    lang_counts = (
        db.query(Submission.language, func.count(Submission.id))
        .filter(Submission.user_id == current_user.id)
        .group_by(Submission.language)
        .all()
    )
    languages_used = {lang: count for lang, count in lang_counts}

    # 3. Average Engineering Score
    avg_score_res = (
        db.query(func.avg(Report.engineering_score))
        .join(Submission, Submission.id == Report.submission_id)
        .filter(Submission.user_id == current_user.id)
        .scalar()
    )
    average_engineering_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0

    # 4. Complexity Distribution
    complexity_counts = (
        db.query(Report.time_complexity, func.count(Report.id))
        .join(Submission, Submission.id == Report.submission_id)
        .filter(Submission.user_id == current_user.id)
        .group_by(Report.time_complexity)
        .all()
    )
    # Convert list of tuples to dictionary
    average_complexity = {}
    for comp, count in complexity_counts:
        # Simplify complexity label if needed
        label = comp or "Unknown"
        average_complexity[label] = float(count)

    # 5. Coding Improvement Trend
    trend_res = (
        db.query(
            func.to_char(Report.created_at, "YYYY-MM-DD").label("date"),
            func.avg(Report.engineering_score).label("avg_score")
        )
        .join(Submission, Submission.id == Report.submission_id)
        .filter(Submission.user_id == current_user.id)
        .group_by(func.to_char(Report.created_at, "YYYY-MM-DD"))
        .order_by("date")
        .all()
    )
    coding_improvement_trend = [{"date": r.date, "score": round(float(r.avg_score), 1)} for r in trend_res]

    # 6. Recent Reports (limit to 5)
    recent_subs = (
        db.query(Submission)
        .filter(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(5)
        .all()
    )
    recent_reports = []
    for sub in recent_subs:
        score = sub.report.engineering_score if sub.report else None
        recent_reports.append(
            SubmissionHistoryResponse(
                id=sub.id,
                language=sub.language,
                status=sub.status,
                execution_time_ms=sub.execution_time_ms,
                memory_usage_kb=sub.memory_usage_kb,
                created_at=sub.created_at,
                engineering_score=score
            )
        )

    return DashboardAnalytics(
        total_runs=total_runs,
        languages_used=languages_used,
        average_engineering_score=average_engineering_score,
        average_complexity=average_complexity,
        coding_improvement_trend=coding_improvement_trend,
        recent_reports=recent_reports
    )
