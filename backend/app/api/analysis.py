from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.database import AsyncSessionLocal, get_db
from app.models.analysis import Analysis
from app.models.document import Document
from app.models.user import User
from app.schemas.analysis import AnalysisResponse
from app.services.ai_pipeline import generate_example_tz, run_full_pipeline

router = APIRouter(prefix="/analysis", tags=["analysis"])
STALE_ANALYSIS_TIMEOUT_SECONDS = 180


def _ai_service_unavailable(exc: Exception) -> HTTPException:
    return HTTPException(status_code=503, detail=f"AI-сервис временно недоступен: {exc}")


def _is_stale_running_analysis(analysis: Analysis) -> bool:
    if analysis.status != "running":
        return False
    if not analysis.updated_at:
        return False
    age_seconds = (datetime.utcnow() - analysis.updated_at).total_seconds()
    return age_seconds > STALE_ANALYSIS_TIMEOUT_SECONDS


async def _run_analysis_task(doc_id: int, document_text: str):
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Analysis).where(Analysis.document_id == doc_id))
            analysis = result.scalar_one_or_none()

            if not analysis:
                analysis = Analysis(document_id=doc_id, status="running")
                db.add(analysis)
                await db.commit()
                await db.refresh(analysis)
            else:
                analysis.status = "running"
                analysis.updated_at = datetime.utcnow()
                await db.commit()

            pipeline_result = await run_full_pipeline(document_text)

            analysis.status = "completed"
            analysis.score = pipeline_result["score"]
            analysis.score_breakdown = pipeline_result["score_breakdown"]
            analysis.sections = pipeline_result["sections"]
            analysis.missing_sections = pipeline_result.get("missing_sections", [])
            analysis.issues = pipeline_result["issues"]
            analysis.recommendations = pipeline_result["recommendations"]
            analysis.structure_template = pipeline_result["structure_template"]
            analysis.document_summary = pipeline_result.get("document_summary")
            analysis.consistency_score = pipeline_result.get("consistency_score")
            analysis.overall_coherence = pipeline_result.get("overall_coherence")
            analysis.improved_text = pipeline_result.get("improved_text")
            analysis.updated_at = datetime.utcnow()
            await db.commit()
        except Exception as exc:
            async with AsyncSessionLocal() as db2:
                result = await db2.execute(select(Analysis).where(Analysis.document_id == doc_id))
                analysis = result.scalar_one_or_none()
                if analysis:
                    analysis.status = "failed"
                    analysis.error_message = str(exc)
                    analysis.updated_at = datetime.utcnow()
                    await db2.commit()
            print(f"Pipeline error for doc {doc_id}: {exc}")


@router.post("/{doc_id}", response_model=AnalysisResponse, status_code=202)
async def start_analysis(
    doc_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="AI-сервис не настроен: отсутствует OPENAI_API_KEY")

    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    analysis_result = await db.execute(select(Analysis).where(Analysis.document_id == doc_id))
    analysis = analysis_result.scalar_one_or_none()

    if analysis and analysis.status == "completed":
        return AnalysisResponse.model_validate(analysis)

    if analysis and analysis.status == "running" and not _is_stale_running_analysis(analysis):
        return AnalysisResponse.model_validate(analysis)

    if analysis and _is_stale_running_analysis(analysis):
        analysis.status = "pending"
        analysis.error_message = "Предыдущий запуск анализа был прерван и автоматически перезапущен."
        analysis.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(analysis)

    if not analysis:
        analysis = Analysis(document_id=doc_id, status="pending")
        db.add(analysis)
        await db.commit()
        await db.refresh(analysis)

    background_tasks.add_task(_run_analysis_task, doc_id, doc.original_text)
    analysis.status = "running"
    await db.commit()
    await db.refresh(analysis)

    return AnalysisResponse.model_validate(analysis)


@router.get("/{doc_id}", response_model=AnalysisResponse)
async def get_analysis(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Документ не найден")

    result = await db.execute(select(Analysis).where(Analysis.document_id == doc_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Анализ не найден")

    return AnalysisResponse.model_validate(analysis)


@router.get("/{doc_id}/improved")
async def get_improved_text(
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

    result = await db.execute(select(Analysis).where(Analysis.document_id == doc_id))
    analysis = result.scalar_one_or_none()
    if not analysis or analysis.status != "completed":
        raise HTTPException(status_code=404, detail="Анализ не завершен")

    return {
        "original_text": doc.original_text,
        "improved_text": analysis.improved_text,
    }


@router.get("/{doc_id}/example")
async def get_example_tz(
    doc_id: int,
    domain: str = "информационные технологии",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Документ не найден")

    try:
        example = await generate_example_tz(domain)
    except RuntimeError as exc:
        raise _ai_service_unavailable(exc) from exc

    return {"example_text": example, "domain": domain}
