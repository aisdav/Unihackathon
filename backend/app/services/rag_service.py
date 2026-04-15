import json
import os
from typing import Any

from app.config import settings

_client = None
_collection = None
_rag_disabled_reason = None


def _import_chromadb():
    import chromadb
    from chromadb.utils import embedding_functions

    return chromadb, embedding_functions


def _get_collection():
    global _client, _collection, _rag_disabled_reason

    if _collection is not None:
        return _collection

    if _rag_disabled_reason:
        raise RuntimeError(_rag_disabled_reason)

    if not settings.openai_api_key:
        _rag_disabled_reason = "OPENAI_API_KEY is not configured"
        raise RuntimeError(_rag_disabled_reason)

    try:
        chromadb, embedding_functions = _import_chromadb()
    except Exception as exc:
        _rag_disabled_reason = f"ChromaDB import failed: {exc}"
        raise RuntimeError(_rag_disabled_reason) from exc

    _client = chromadb.PersistentClient(path=settings.chroma_path)
    openai_ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=settings.openai_api_key,
        model_name="text-embedding-3-small",
    )
    _collection = _client.get_or_create_collection(
        name="tz_examples",
        embedding_function=openai_ef,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def init_rag_from_seed():
    """Load seed examples into ChromaDB if not already loaded."""
    try:
        collection = _get_collection()
    except Exception as exc:
        print(f"RAG init skipped: {exc}")
        return

    seed_path = os.path.join(settings.data_path, "examples", "seed_data.json")
    if not os.path.exists(seed_path):
        print(f"Seed data not found at {seed_path}")
        return

    with open(seed_path, "r", encoding="utf-8") as f:
        examples = json.load(f)

    # Re-seed if the collection is empty or has fewer entries than the seed file
    # (handles the case where seed data was expanded between runs)
    existing_count = collection.count()
    if existing_count >= len(examples):
        return

    documents: list[str] = []
    metadatas: list[dict[str, Any]] = []
    ids: list[str] = []

    for ex in examples:
        documents.append(ex["text"])
        metadata = {
            "section_type": ex["section_type"],
            "quality": ex["quality"],
            "annotation": ex["annotation"],
        }
        if "issue" in ex:
            metadata["issue"] = ex["issue"]
        metadatas.append(metadata)
        ids.append(ex["id"])

    if existing_count > 0:
        # Upsert to avoid duplicate-id errors on partial re-seeding
        collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
        print(f"RAG re-seeded: upserted {len(documents)} examples (was {existing_count})")
    else:
        collection.add(documents=documents, metadatas=metadatas, ids=ids)
        print(f"RAG initialized with {len(documents)} seed examples")


def list_examples(limit: int = 100, offset: int = 0) -> dict:
    """Return all examples in the collection with pagination."""
    try:
        collection = _get_collection()
    except Exception as exc:
        return {"items": [], "total": 0, "error": str(exc)}

    total = collection.count()
    if total == 0:
        return {"items": [], "total": 0}

    try:
        result = collection.get(
            limit=limit,
            offset=offset,
            include=["documents", "metadatas"],
        )
    except Exception as exc:
        return {"items": [], "total": total, "error": str(exc)}

    items = []
    for i, doc_id in enumerate(result["ids"]):
        meta = result["metadatas"][i] if result["metadatas"] else {}
        items.append({
            "id": doc_id,
            "text": result["documents"][i] if result["documents"] else "",
            "section_type": meta.get("section_type", ""),
            "quality": meta.get("quality", ""),
            "annotation": meta.get("annotation", ""),
            "issue": meta.get("issue", ""),
        })
    return {"items": items, "total": total}


def add_example(example_id: str, text: str, section_type: str, quality: str, annotation: str, issue: str = "") -> dict:
    """Add or update a single example in the collection."""
    try:
        collection = _get_collection()
    except Exception as exc:
        raise RuntimeError(f"RAG unavailable: {exc}") from exc

    metadata: dict[str, Any] = {
        "section_type": section_type,
        "quality": quality,
        "annotation": annotation,
    }
    if issue:
        metadata["issue"] = issue

    collection.upsert(documents=[text], metadatas=[metadata], ids=[example_id])
    return {"id": example_id, "status": "ok"}


def delete_example(example_id: str) -> dict:
    """Delete a single example from the collection by id."""
    try:
        collection = _get_collection()
    except Exception as exc:
        raise RuntimeError(f"RAG unavailable: {exc}") from exc

    collection.delete(ids=[example_id])
    return {"id": example_id, "status": "deleted"}


def get_stats() -> dict:
    """Return basic stats about the collection."""
    try:
        collection = _get_collection()
        total = collection.count()
        return {"total": total, "status": "ok"}
    except Exception as exc:
        return {"total": 0, "status": "unavailable", "error": str(exc)}


def find_similar_examples(section_text: str, section_type: str | None = None, top_k: int = 3) -> list:
    """Find similar examples for a given section text."""
    try:
        collection = _get_collection()
    except Exception:
        return []

    total = collection.count()
    if total == 0:
        return []

    # Clamp n_results to total collection size to avoid ChromaDB errors
    n_results = min(top_k, total)
    where = {"section_type": section_type} if section_type else None

    try:
        results = collection.query(
            query_texts=[section_text],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        if where is None:
            return []
        # Filtered query failed (likely n_results > filtered count); retry without filter
        # so the QualityAgent still gets some relevant context
        try:
            results = collection.query(
                query_texts=[section_text],
                n_results=n_results,
                include=["documents", "metadatas", "distances"],
            )
        except Exception:
            return []

    examples = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            distance = results["distances"][0][i] if results["distances"] else None
            examples.append(
                {
                    "text": doc,
                    "quality": meta.get("quality", "unknown"),
                    "annotation": meta.get("annotation", ""),
                    "issue": meta.get("issue", ""),
                    "section_type": meta.get("section_type", ""),
                    "similarity": round(1 - distance, 3) if distance is not None else None,
                }
            )
    return examples
