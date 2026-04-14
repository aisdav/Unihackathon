from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AnalysisResponse(BaseModel):
    id: int
    document_id: int
    status: str
    score: Optional[float] = None
    score_breakdown: Optional[dict] = None
    sections: Optional[list] = None
    missing_sections: Optional[list] = None
    issues: Optional[list] = None
    recommendations: Optional[list] = None
    structure_template: Optional[list] = None
    document_summary: Optional[str] = None
    consistency_score: Optional[float] = None
    overall_coherence: Optional[str] = None
    improved_text: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
