from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from ..database import get_db
from ..models import Submission, Report, User
from ..schemas import SubmissionCreate, SubmissionResponse, SubmissionHistoryResponse
from ..auth import get_current_user
from ..runner import run_code
from ..ai_service import generate_report

router = APIRouter(prefix="/submissions", tags=["Submissions"])

@router.post("", response_model=SubmissionResponse)
async def create_submission(
    payload: SubmissionCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # 1. Execute the code
    result = run_code(payload.code, payload.language, payload.stdin)
    
    # 2. Save the submission
    submission = Submission(
        user_id=current_user.id,
        language=payload.language,
        code=payload.code,
        status=result["status"],
        output=result["output"],
        error=result["error"],
        execution_time_ms=result["execution_time_ms"],
        memory_usage_kb=result["memory_usage_kb"]
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # 3. Generate AI report if compilation succeeded
    report = None
    if result["status"] != "Compile Error":
        ai_report_data = await generate_report(payload.code, payload.language, result)
        
        # Save the report
        report = Report(
            submission_id=submission.id,
            engineering_score=ai_report_data["engineering_score"],
            time_complexity=ai_report_data["time_complexity"],
            space_complexity=ai_report_data["space_complexity"],
            complexity_reasoning=ai_report_data["complexity_reasoning"],
            current_approach=ai_report_data["current_approach"],
            optimal_approach=ai_report_data["optimal_approach"],
            optimization_suggestions=ai_report_data["optimization_suggestions"],
            readability_score=ai_report_data["readability_score"],
            maintainability_score=ai_report_data["maintainability_score"],
            best_practices_score=ai_report_data["best_practices_score"],
            code_quality_suggestions=ai_report_data["code_quality_suggestions"],
            bug_analysis=ai_report_data["bug_analysis"],
            edge_cases=ai_report_data["edge_cases"],
            security_issues=ai_report_data["security_issues"],
            concepts_used=ai_report_data["concepts_used"],
            weak_areas=ai_report_data["weak_areas"],
            suggested_topics=ai_report_data["suggested_topics"]
        )
        db.add(report)
        db.commit()
        db.refresh(submission) # This will load the relationship
        
    return submission

@router.get("", response_model=List[SubmissionHistoryResponse])
def get_submission_history(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    submissions = (
        db.query(Submission)
        .filter(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .all()
    )
    
    # Map to schema manually or let SQL Alchemy handle relationships
    history = []
    for sub in submissions:
        score = sub.report.engineering_score if sub.report else None
        history.append(
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
    return history

@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission_details(
    submission_id: UUID, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.user_id == current_user.id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    return submission
