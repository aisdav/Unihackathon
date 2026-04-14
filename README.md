# TZ Analyzer

AI-система анализа и улучшения технических заданий научных проектов, собранная для хакатона `НТЗ LAB: Хакатон конкурентных решений`.

Приложение позволяет:
- загружать ТЗ в форматах `PDF`, `DOCX`, `TXT`;
- автоматически анализировать структуру документа;
- находить пропущенные разделы, расплывчатые формулировки и логические несоответствия;
- оценивать качество ТЗ по шкале `0-100`;
- получать рекомендации и улучшенную версию текста;
- скачивать итоговый отчет;
- общаться с AI-ассистентом по документу через чат со streaming.

## Stack

- Frontend: `React 18`, `Vite`, `Tailwind CSS`, `Nginx`
- Backend: `FastAPI`, `SQLAlchemy`, `Alembic`
- AI: `OpenAI`, `ChromaDB`, `pymupdf4llm`
- Data: `PostgreSQL`, `Redis`
- Async scaffold: `Celery` service is present in `docker-compose.yml`
- Infra: `Docker Compose`

## Architecture

```text
Frontend (React + Vite + Nginx)
        |
        v
Backend API (FastAPI)
        |
        +--> Document parser (PDF / DOCX / TXT)
        +--> AI pipeline
        |      1. StructureAgent
        |      2. RAG lookup
        |      3. QualityAgent
        |      4. ConsistencyAgent
        |      5. Improved text generation
        |
        +--> Report generator
        |
        +--> PostgreSQL / ChromaDB / Redis
```

## Project Structure

```text
Unihackathon/
|-- docker-compose.yml
|-- .env.example
|-- README.md
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- alembic/
|   |-- data/examples/
|   `-- app/
|       |-- api/
|       |-- models/
|       |-- schemas/
|       `-- services/
`-- frontend/
    |-- Dockerfile
    |-- nginx.conf
    |-- package.json
    `-- src/
```

## Quick Start

1. Create `.env` from `.env.example`.
2. Fill in `OPENAI_API_KEY`.
3. Run:

```bash
docker compose up --build
```

4. Open:
- Frontend: `http://localhost:3000`
- Backend API docs: `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/health`

To stop the stack:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```

## Environment Variables

Required:

```env
OPENAI_API_KEY=sk-...
POSTGRES_USER=tzanalyzer
POSTGRES_PASSWORD=tzpassword
POSTGRES_DB=tzanalyzer
SECRET_KEY=your-super-secret-jwt-key-change-in-production
```

## Main User Flow

1. Register and sign in.
2. Upload a technical specification.
3. Start AI analysis.
4. Review score, issues, missing sections, and recommendations.
5. Open the improved text tab.
6. Download the generated report.
7. Ask follow-up questions in the chat.

## Feature Coverage Against Hackathon TZ

- Upload document: implemented
- Analyze structure: implemented
- Check mandatory sections: implemented
- AI text analysis: implemented
- Detect vague wording and inconsistencies: implemented
- Generate recommendations: implemented
- Build recommended TZ structure: implemented
- Generate example TZ: implemented
- Score document quality: implemented
- Export final report: implemented
- Chat assistant: implemented

## API Overview

Auth:
- `POST /auth/register`
- `POST /auth/login`

Documents:
- `POST /documents/upload`
- `GET /documents/`
- `GET /documents/{id}`

Analysis:
- `POST /analysis/{doc_id}`
- `GET /analysis/{doc_id}`
- `GET /analysis/{doc_id}/improved`
- `GET /analysis/{doc_id}/example`

Chat:
- `POST /chat/{doc_id}`
- `POST /chat/{doc_id}/stream`
- `GET /chat/{doc_id}/history`

Reports:
- `GET /reports/{doc_id}/pdf`

## Notes

- Backend currently accepts files up to `10 MB`.
- The frontend proxies API requests through `Nginx` at `/api`.
- Chat streaming uses `Server-Sent Events` semantics through the `/chat/{doc_id}/stream` endpoint.
- Analysis is currently launched through FastAPI background tasks; the Celery worker in compose is a scaffold and still needs task wiring.

## Demo Checklist

1. Register a new user.
2. Upload a sample `DOCX` or `PDF`.
3. Trigger analysis and wait for status `completed`.
4. Show the score, issues, recommendations, and improved text.
5. Download the report.
6. Open chat and ask for clarification on one issue.
