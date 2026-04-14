import io
import re

import fitz
import pymupdf4llm
from docx import Document as DocxDocument


def parse_document(file_bytes: bytes, file_type: str) -> str:
    if file_type == "pdf":
        return _parse_pdf(file_bytes)
    if file_type == "docx":
        return _parse_docx(file_bytes)
    if file_type == "txt":
        return _parse_txt(file_bytes)
    raise ValueError(f"Неизвестный тип файла: {file_type}")


def _parse_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    total_chars = 0
    unrecognized_chars = 0

    for page in doc:
        text = page.get_text()
        total_chars += len(text)
        unrecognized_chars += len(re.findall(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd\ufffe]", text))

    if total_chars > 0:
        unrecognized_ratio = unrecognized_chars / total_chars
        if unrecognized_ratio > 0.15:
            raise ValueError(
                "PDF содержит отсканированные или нечитаемые страницы. "
                "Пожалуйста, загрузите документ в формате DOCX или TXT."
            )

    if total_chars < 100 and len(doc) > 0:
        raise ValueError(
            "PDF не содержит распознанного текста. Документ, вероятно, является "
            "отсканированным изображением. Загрузите документ в формате DOCX или TXT."
        )

    doc.close()
    return pymupdf4llm.to_markdown(io.BytesIO(file_bytes))


def _parse_docx(file_bytes: bytes) -> str:
    doc = DocxDocument(io.BytesIO(file_bytes))
    parts = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        if para.style and para.style.name.startswith("Heading"):
            level = para.style.name.replace("Heading ", "").strip()
            try:
                hashes = "#" * int(level)
            except ValueError:
                hashes = "#"
            parts.append(f"{hashes} {text}")
        else:
            parts.append(text)
    return "\n\n".join(parts)


def _parse_txt(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1251", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="replace")
