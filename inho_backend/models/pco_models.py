"""
INHO – PCO Models (Pesquisa de Clima Organizacional)
Survey → Questions → Responses → Answers (fully relational, no fake data)
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    String, Text, Integer, Index, SmallInteger
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.session import Base


# ── Enums ─────────────────────────────────────────────────────────
class PCOSurveyStatus(str, enum.Enum):
    DRAFT    = "DRAFT"
    ACTIVE   = "ACTIVE"
    CLOSED   = "CLOSED"
    ARCHIVED = "ARCHIVED"


class PCOQuestionType(str, enum.Enum):
    SCALE   = "SCALE"    # 1-5 Likert
    YES_NO  = "YES_NO"   # boolean
    TEXT    = "TEXT"     # open text
    MULTI   = "MULTI"    # multiple choice


class PCOIndicator(str, enum.Enum):
    TURNOVER        = "TURNOVER"
    ABSENTEISMO     = "ABSENTEISMO"
    LIDERANCA       = "LIDERANCA"
    COMUNICACAO     = "COMUNICACAO"
    BENEFICIOS      = "BENEFICIOS"
    DESENVOLVIMENTO = "DESENVOLVIMENTO"
    AMBIENTE        = "AMBIENTE"
    CONFLITOS       = "CONFLITOS"
    MOTIVACAO       = "MOTIVACAO"
    GERAL           = "GERAL"


# ── PCOSurvey ─────────────────────────────────────────────────────
class PCOSurvey(Base):
    """Pesquisa de Clima Organizacional — ciclo de vida próprio"""
    __tablename__ = "pco_surveys"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    created_by  = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title       = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status      = Column(Enum(PCOSurveyStatus), nullable=False, default=PCOSurveyStatus.DRAFT)
    is_anonymous = Column(Boolean, default=True, nullable=False)

    opens_at  = Column(DateTime(timezone=True), nullable=True)
    closes_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    questions = relationship("PCOQuestion", back_populates="survey", cascade="all, delete-orphan",
                             order_by="PCOQuestion.order_index")
    responses  = relationship("PCOResponse", back_populates="survey", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_pco_surveys_status", "status"),
        Index("ix_pco_surveys_created_by", "created_by"),
    )

    def __repr__(self) -> str:
        return f"<PCOSurvey {self.title!r} [{self.status}]>"


# ── PCOQuestion ───────────────────────────────────────────────────
class PCOQuestion(Base):
    """Pergunta da pesquisa — associada a um indicador de clima"""
    __tablename__ = "pco_questions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id   = Column(UUID(as_uuid=True), ForeignKey("pco_surveys.id", ondelete="CASCADE"), nullable=False)
    indicator   = Column(Enum(PCOIndicator), nullable=False, default=PCOIndicator.GERAL)
    q_type      = Column(Enum(PCOQuestionType), nullable=False, default=PCOQuestionType.SCALE)
    text        = Column(Text, nullable=False)
    options     = Column(Text, nullable=True)   # JSON string for MULTI type
    order_index = Column(SmallInteger, nullable=False, default=0)
    required    = Column(Boolean, default=True, nullable=False)

    survey  = relationship("PCOSurvey", back_populates="questions")
    answers = relationship("PCOAnswer", back_populates="question", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_pco_questions_survey", "survey_id"),
        Index("ix_pco_questions_indicator", "indicator"),
    )


# ── PCOResponse ───────────────────────────────────────────────────
class PCOResponse(Base):
    """Uma submissão completa da pesquisa por um colaborador"""
    __tablename__ = "pco_responses"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id  = Column(UUID(as_uuid=True), ForeignKey("pco_surveys.id", ondelete="CASCADE"), nullable=False)
    respondent_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # nullable quando anônimo — IP nunca é armazenado para garantir anonimato
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    survey  = relationship("PCOSurvey", back_populates="responses")
    answers = relationship("PCOAnswer", back_populates="response", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_pco_responses_survey", "survey_id"),
        Index("ix_pco_responses_submitted", "submitted_at"),
    )


# ── PCOAnswer ─────────────────────────────────────────────────────
class PCOAnswer(Base):
    """Resposta individual para uma questão específica"""
    __tablename__ = "pco_answers"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id = Column(UUID(as_uuid=True), ForeignKey("pco_responses.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("pco_questions.id", ondelete="CASCADE"), nullable=False)

    # Apenas um destes campos é preenchido dependendo do tipo da questão
    score       = Column(SmallInteger, nullable=True)   # para SCALE (1-5)
    bool_value  = Column(Boolean, nullable=True)         # para YES_NO
    text_value  = Column(Text, nullable=True)            # para TEXT / MULTI

    response = relationship("PCOResponse", back_populates="answers")
    question = relationship("PCOQuestion", back_populates="answers")

    __table_args__ = (
        Index("ix_pco_answers_response", "response_id"),
        Index("ix_pco_answers_question", "question_id"),
    )
