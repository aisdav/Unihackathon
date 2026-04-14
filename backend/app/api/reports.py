from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.analysis import Analysis
from app.models.document import Document
from app.models.user import User
from app.services.report_generator import generate_pdf_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{doc_id}/pdf")
async def download_report(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    analysis_result = await db.execute(select(Analysis).where(Analysis.document_id == doc_id))
    analysis = analysis_result.scalar_one_or_none()
    if not analysis or analysis.status != "completed":
        raise HTTPException(status_code=404, detail="Анализ не завершен")

    try:
        pdf_bytes = generate_pdf_report(
            filename=doc.filename,
            score=analysis.score or 0,
            score_breakdown=analysis.score_breakdown or {},
            sections=analysis.sections or [],
            missing_sections=analysis.missing_sections or [],
            issues=analysis.issues or [],
            recommendations=analysis.recommendations or [],
            structure_template=analysis.structure_template or [],
            document_summary=analysis.document_summary,
            consistency_score=analysis.consistency_score,
            overall_coherence=analysis.overall_coherence,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Не удалось сформировать отчет: {exc}") from exc

    content_type = "application/pdf"
    ext = "pdf"
    if pdf_bytes[:5] == b"<!DOC" or pdf_bytes[:9] == b"<!DOCTYPE":
        content_type = "text/html"
        ext = "html"

    safe_name = doc.filename.rsplit(".", 1)[0]
    return Response(
        content=pdf_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="report_{safe_name}.{ext}"'},
    )
