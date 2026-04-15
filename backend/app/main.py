from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, auth, chat, documents, rag, reports
from app.services.rag_service import init_rag_from_seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_rag_from_seed()
        print("RAG initialized successfully")
    except Exception as exc:
        print(f"RAG initialization warning: {exc}")
    yield


app = FastAPI(
    title="ТЗ Анализатор API",
    description="AI-система анализа и улучшения технических заданий научных проектов",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(analysis.router)
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(rag.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tz-analyzer"}
