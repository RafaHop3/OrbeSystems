"""
INHO – PCO (Organizational Climate) Router
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import User, UserRole, AuditAction
from models.pco_models import PCOSurvey, PCOQuestion, PCOResponse, PCOAnswer, PCOSurveyStatus
from schemas.schemas import PCOSurveyOut, PCOResponseSubmit
from services.audit import write_audit

router = APIRouter(prefix="/pco", tags=["PCO"])


@router.get("/surveys", response_model=List[PCOSurveyOut])
async def list_active_surveys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all active surveys with their questions.
    """
    query = (
        select(PCOSurvey)
        .where(PCOSurvey.status == PCOSurveyStatus.ACTIVE)
        .options(selectinload(PCOSurvey.questions))
    )
    result = await db.execute(query)
    surveys = result.scalars().all()
    return surveys


@router.post("/surveys/{survey_id}/submit", status_code=status.HTTP_201_CREATED)
async def submit_survey_response(
    request: Request,
    survey_id: UUID,
    body: PCOResponseSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a response to an active survey.
    """
    # 1. Verify survey exists and is active
    query = select(PCOSurvey).where(PCOSurvey.id == survey_id)
    result = await db.execute(query)
    survey = result.scalar_one_or_none()

    if not survey:
        raise HTTPException(status_code=404, detail="Pesquisa não encontrada")
    if survey.status != PCOSurveyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Esta pesquisa não está aceitando respostas")

    # 2. Create Response record
    response = PCOResponse(
        survey_id=survey_id,
        respondent_id=None if survey.is_anonymous else current_user.id
    )
    db.add(response)
    await db.flush()

    # 3. Create Answer records
    for ans in body.answers:
        answer_rec = PCOAnswer(
            response_id=response.id,
            question_id=ans.question_id,
            score=ans.score,
            bool_value=ans.bool_value,
            text_value=ans.text_value
        )
        db.add(answer_rec)

    await write_audit(
        db, AuditAction.UPDATE, "PCOResponse",
        user_id=current_user.id, entity_id=str(response.id),
        detail={"survey_id": str(survey_id), "anonymous": survey.is_anonymous},
        request=request,
    )

    await db.commit()
    return {"message": "Resposta enviada com sucesso", "response_id": response.id}
