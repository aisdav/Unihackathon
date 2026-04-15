import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.api.deps import get_current_user
from app.services.rag_service import add_example, delete_example, get_stats, list_examples

router = APIRouter(prefix="/rag", tags=["rag"])

VALID_SECTION_TYPES = {
    "purpose", "tasks", "kpi", "timeline", "resources",
    "expected_results", "methodology", "background", "requirements", "other",
}
VALID_QUALITY = {"high", "low"}


class AddExampleRequest(BaseModel):
    text: str
    section_type: str
    quality: str
    annotation: str
    issue: str = ""
    custom_id: str = ""

    @field_validator("section_type")
    @classmethod
    def check_section_type(cls, v):
        if v not in VALID_SECTION_TYPES:
            raise ValueError(f"section_type must be one of {sorted(VALID_SECTION_TYPES)}")
        return v

    @field_validator("quality")
    @classmethod
    def check_quality(cls, v):
        if v not in VALID_QUALITY:
            raise ValueError("quality must be 'high' or 'low'")
        return v

    @field_validator("text")
    @classmethod
    def check_text(cls, v):
        if len(v.strip()) < 10:
            raise ValueError("text must be at least 10 characters")
        return v.strip()

    @field_validator("annotation")
    @classmethod
    def check_annotation(cls, v):
        if len(v.strip()) < 5:
            raise ValueError("annotation must be at least 5 characters")
        return v.strip()


def _make_id(custom_id: str, section_type: str, quality: str) -> str:
    if custom_id:
        safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", custom_id)[:64]
        return safe
    return f"{section_type}_{quality}_{uuid.uuid4().hex[:8]}"


@router.get("/stats")
async def rag_stats(_user=Depends(get_current_user)):
    return get_stats()


@router.get("/examples")
async def rag_list(limit: int = 100, offset: int = 0, _user=Depends(get_current_user)):
    return list_examples(limit=limit, offset=offset)


@router.post("/examples", status_code=201)
async def rag_add(body: AddExampleRequest, _user=Depends(get_current_user)):
    example_id = _make_id(body.custom_id, body.section_type, body.quality)
    try:
        return add_example(
            example_id=example_id,
            text=body.text,
            section_type=body.section_type,
            quality=body.quality,
            annotation=body.annotation,
            issue=body.issue,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.delete("/examples/{example_id}", status_code=200)
async def rag_delete(example_id: str, _user=Depends(get_current_user)):
    try:
        return delete_example(example_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
