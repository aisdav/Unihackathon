from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse
from app.services.document_parser import parse_document

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "docx",
    "text/plain": "txt",
}


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content_type = file.content_type or ""
    file_type = ALLOWED_TYPES.get(content_type)

    if not file_type and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext == "pdf":
            file_type = "pdf"
        elif ext in ("docx", "doc"):
            file_type = "docx"
        elif ext == "txt":
            file_type = "txt"

    if not file_type:
        raise HTTPException(status_code=400, detail="Поддерживаемые форматы: PDF, DOCX, TXT")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл слишком большой. Максимальный размер: 10 МБ")

    try:
        text = parse_document(file_bytes, file_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Ошибка чтения файла: {exc}") from exc

    if len(text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Документ слишком короткий или пустой")

    doc = Document(
        user_id=current_user.id,
        filename=file.filename or f"document.{file_type}",
        original_text=text,
        file_type=file_type,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        created_at=doc.created_at,
        has_analysis=False,
    )


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.analysis))
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    responses = [
        DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            file_type=doc.file_type,
            created_at=doc.created_at,
            has_analysis=doc.analysis is not None,
            analysis_status=doc.analysis.status if doc.analysis else None,
            analysis_score=doc.analysis.score if doc.analysis else None,
        )
        for doc in docs
    ]

    return DocumentListResponse(documents=responses, total=len(responses))


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.analysis))
        .where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        created_at=doc.created_at,
        has_analysis=doc.analysis is not None,
        analysis_status=doc.analysis.status if doc.analysis else None,
        analysis_score=doc.analysis.score if doc.analysis else None,
    )
