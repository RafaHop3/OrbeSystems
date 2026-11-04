"""Endpoints da Mesh Books conectados com o Banco de Dados (Manual 11, secao 5)."""
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models.users import User
from models.mesh_books import CatalogWork, PhysicalCopy, Marginalia
from security.auth import get_current_user
from services.books_catalog import lookup_isbn, mask_spoilers, normalize_isbn

router = APIRouter()


class BookOut(BaseModel):
    id: Optional[uuid.UUID] = None
    isbn13: str
    title: str
    authors: List[str]
    cover_url: Optional[str] = None
    source: str


class AddCopyIn(BaseModel):
    isbn13: str
    circulation_policy: str = Field(default="display_only", pattern="^(display_only|first_degree|second_degree|local_mesh)$")
    h3_cell: Optional[str] = None


class NoteIn(BaseModel):
    progress_threshold: float = Field(ge=0, le=100)
    body: str


class MaskRequest(BaseModel):
    reader_progress: float = Field(ge=0, le=100)
    notes: List[NoteIn]


@router.get("/isbn/{isbn}", response_model=BookOut)
def get_book_by_isbn(isbn: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Metadados por ISBN-13/10: consulta cache local (catalog_works), senao busca na API e cacheia."""
    clean_isbn = normalize_isbn(isbn)
    if not clean_isbn:
        raise HTTPException(status_code=422, detail="ISBN invalido")

    # 1. Checa cache local no banco
    work = db.query(CatalogWork).filter(CatalogWork.isbn13 == clean_isbn).first()
    if work:
        return BookOut(
            id=work.id,
            isbn13=work.isbn13,
            title=work.title,
            authors=work.authors or [],
            cover_url=work.cover_url,
            source=work.source,
        )

    # 2. Busca externa (Google Books -> OpenLibrary)
    book_data = lookup_isbn(clean_isbn)
    if not book_data:
        raise HTTPException(status_code=404, detail="Livro nao encontrado nas bases integradas")

    # 3. Cacheia no catalogo se for postgres/db conectado
    try:
        new_work = CatalogWork(
            isbn13=book_data["isbn13"],
            title=book_data["title"],
            authors=book_data["authors"],
            cover_url=book_data["cover_url"],
            source=book_data["source"],
        )
        db.add(new_work)
        db.commit()
        db.refresh(new_work)
        book_data["id"] = new_work.id
    except Exception:
        db.rollback()
        # Nao falha a consulta se o cache der erro (ex: banco readonly ou lock)

    return BookOut(**book_data)


@router.post("/marginalia/mask")
def mask_marginalia_endpoint(req: MaskRequest, current_user: User = Depends(get_current_user)):
    """Aplica o bloqueio anti-spoiler segundo o progresso do leitor."""
    return mask_spoilers([n.model_dump() for n in req.notes], req.reader_progress)
