"""
INHO – Router: EntityNotes & EntityFiles
Widget de Anotações e Repositório de Arquivos transversal (spec §2.4)
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user
from db.session import get_db
from models.models import EntityFile, EntityNote, User
from routers.billing import _get_user_business
from schemas.crm_schemas import (
    EntityFileCreate, EntityFileOut,
    EntityNoteCreate, EntityNoteOut,
)

router = APIRouter(prefix="/api/v1/notes", tags=["Notas & Arquivos"])


# ── ENTITY NOTES ─────────────────────────────────────────────────

@router.post("/", response_model=EntityNoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: EntityNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria uma anotação auditada vinculada a qualquer entidade."""
    business = await _get_user_business(db, current_user)
    note = EntityNote(
        business_id=business.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        content=payload.content,
        author_id=str(current_user.id),
        author_name=current_user.full_name,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.get("/", response_model=List[EntityNoteOut])
async def list_notes(
    entity_type: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todas as anotações de uma entidade específica."""
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(EntityNote)
        .where(
            EntityNote.business_id == business.id,
            EntityNote.entity_type == entity_type,
            EntityNote.entity_id == entity_id,
        )
        .order_by(EntityNote.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove uma anotação (somente o autor ou ADMIN pode excluir)."""
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(EntityNote).where(
            EntityNote.id == note_id,
            EntityNote.business_id == business.id,
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Anotação não encontrada")

    # Somente o autor ou admin pode excluir
    if str(note.author_id) != str(current_user.id) and current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(403, "Sem permissão para excluir esta anotação")

    await db.delete(note)
    await db.commit()


# ── ENTITY FILES ─────────────────────────────────────────────────

@router.post("/files/", response_model=EntityFileOut, status_code=status.HTTP_201_CREATED)
async def register_file(
    payload: EntityFileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra metadados de arquivo após upload para S3/cloud.
    O cliente deve fazer upload diretamente para o storage e
    passar a URL resultante neste endpoint.
    """
    business = await _get_user_business(db, current_user)
    entity_file = EntityFile(
        business_id=business.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        filename=payload.filename,
        file_url=payload.file_url,
        file_category=payload.file_category,
        file_size=payload.file_size,
        uploaded_by=current_user.full_name,
    )
    db.add(entity_file)
    await db.commit()
    await db.refresh(entity_file)
    return entity_file


@router.get("/files/", response_model=List[EntityFileOut])
async def list_files(
    entity_type: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos os arquivos vinculados a uma entidade."""
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(EntityFile)
        .where(
            EntityFile.business_id == business.id,
            EntityFile.entity_type == entity_type,
            EntityFile.entity_id == entity_id,
        )
        .order_by(EntityFile.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    business = await _get_user_business(db, current_user)
    result = await db.execute(
        select(EntityFile).where(
            EntityFile.id == file_id,
            EntityFile.business_id == business.id,
        )
    )
    entity_file = result.scalar_one_or_none()
    if not entity_file:
        raise HTTPException(404, "Arquivo não encontrado")
    await db.delete(entity_file)
    await db.commit()
