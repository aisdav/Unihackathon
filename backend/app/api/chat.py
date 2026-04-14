import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.analysis import ChatMessage
from app.models.document import Document
from app.models.user import User
from app.schemas.analysis import ChatMessageCreate, ChatMessageResponse
from app.services.ai_pipeline import chat_with_document, chat_with_document_stream

router = APIRouter(prefix="/chat", tags=["chat"])


def _ai_service_unavailable(exc: Exception) -> HTTPException:
    return HTTPException(status_code=503, detail=f"AI-сервис временно недоступен: {exc}")


@router.post("/{doc_id}/stream")
async def send_message_stream(
    doc_id: int,
    body: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.document_id == doc_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
    )
    history = [{"role": msg.role, "content": msg.content} for msg in history_result.scalars().all()]

    user_msg = ChatMessage(document_id=doc_id, role="user", content=body.content)
    db.add(user_msg)
    await db.commit()

    full_response_parts = []

    async def event_generator():
        try:
            async for token in chat_with_document_stream(doc.original_text, history, body.content):
                full_response_parts.append(token)
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': f'AI-сервис временно недоступен: {exc}'})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
            return

        full_response = "".join(full_response_parts)
        assistant_msg = ChatMessage(document_id=doc_id, role="assistant", content=full_response)
        db.add(assistant_msg)
        await db.commit()

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{doc_id}", response_model=ChatMessageResponse)
async def send_message(
    doc_id: int,
    body: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.document_id == doc_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(20)
    )
    history = [{"role": msg.role, "content": msg.content} for msg in history_result.scalars().all()]

    user_msg = ChatMessage(document_id=doc_id, role="user", content=body.content)
    db.add(user_msg)
    await db.commit()

    try:
        ai_response = await chat_with_document(doc.original_text, history, body.content)
    except Exception as exc:
        raise _ai_service_unavailable(exc) from exc

    assistant_msg = ChatMessage(document_id=doc_id, role="assistant", content=ai_response)
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return ChatMessageResponse.model_validate(assistant_msg)


@router.get("/{doc_id}/history")
async def get_chat_history(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Документ не найден")

    result = await db.execute(
        select(ChatMessage).where(ChatMessage.document_id == doc_id).order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    return {"messages": [ChatMessageResponse.model_validate(message) for message in messages]}
