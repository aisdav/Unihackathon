from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    created_at: datetime
    has_analysis: bool = False
    analysis_status: Optional[str] = None
    analysis_score: Optional[float] = None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
