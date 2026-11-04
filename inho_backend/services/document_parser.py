"""
Serviço de Extração e Particionamento Semântico de Documentos (RAG Chunker).

Processa arquivos de Estatutos Sociais, Regulamentos Internos e Políticas
nos formatos .pdf, .docx e .txt, extraindo o texto e decompondo automaticamente
os artigos, capítulos e cláusulas em chunks prontos para indexação na tabela
inho.ai_knowledge_chunks, respeitando o isolamento estrito por business_id / RLS.
"""

from __future__ import annotations

import io
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from typing import Any, Dict, List, Optional, Tuple

_STOPWORDS = {
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos",
    "das", "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "sob",
    "sobre", "e", "ou", "mas", "que", "se", "como", "ao", "aos", "à", "às",
    "pelo", "pela", "pelos", "pelas", "este", "esta", "estes", "estas", "esse",
    "essa", "esses", "essas", "aquele", "aquela", "aqueles", "aquelas", "isto",
    "isso", "aquilo", "seu", "sua", "seus", "suas", "meu", "minha", "nosso",
    "nossa", "nossos", "nossas", "ser", "estar", "ter", "haver", "fazer",
    "são", "foi", "será", "serão", "for", "forem", "sendo", "tendo", "havendo",
    "qual", "quais", "onde", "quando", "quem", "cujo", "cuja", "cujos", "cujas",
    "art", "artigo", "artigos", "inciso", "parágrafo", "único", "alínea",
    "capítulo", "seção", "título", "livro", "parte", "item", "lei",
}

# Regex principal para identificar divisões estatutárias brasileiras
_ARTICLE_SPLIT_RE = re.compile(
    r"(?m)(?=^\s*(?:art(?:igo)?\.?\s*\d+[º°ªa-zA-Z\d\-]*|cap[íi]tulo\s+[ivxlcdm\d]+|se[çc][ãa]o\s+[ivxlcdm\d]+|cl[áa]usula\s+(?:primeira|segunda|terceira|quarta|quinta|sexta|s[ée]tima|oitava|nona|d[ée]cima|\d+[ªº°a-zA-Z]*)))",
    re.IGNORECASE,
)

_ARTICLE_HEADER_RE = re.compile(
    r"^\s*(art(?:igo)?\.?\s*\d+[º°ªa-zA-Z\d\-]*|cap[íi]tulo\s+[ivxlcdm\d]+|se[çc][ãa]o\s+[ivxlcdm\d]+|cl[áa]usula\s+[^\n–—:-]+)(?:[\s–—:-]+(.*))?$",
    re.IGNORECASE,
)


def extract_text_from_file(filename: str, content_bytes: bytes) -> str:
    """
    Extrai o texto integral de arquivos .pdf, .docx ou .txt.
    Levanta ValueError se a extensão não for suportada ou o arquivo estiver corrompido.
    """
    if not content_bytes:
        raise ValueError("O arquivo anexado está vazio (0 bytes).")

    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower().strip()

    if ext == "txt":
        return _extract_txt(content_bytes)
    elif ext == "pdf":
        return _extract_pdf(content_bytes)
    elif ext == "docx":
        return _extract_docx(content_bytes)
    else:
        raise ValueError(
            f"Extensão '.{ext}' não suportada. Por favor, anexe um arquivo .pdf, .docx ou .txt."
        )


def _extract_txt(content_bytes: bytes) -> str:
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252", "utf-16"):
        try:
            return content_bytes.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return content_bytes.decode("utf-8", errors="replace")


def _extract_pdf(content_bytes: bytes) -> str:
    # 1. Tentar fitz (PyMuPDF - mais rápido e preciso)
    try:
        import fitz  # type: ignore

        doc = fitz.open(stream=content_bytes, filetype="pdf")
        pages = [page.get_text() for page in doc]
        doc.close()
        text = "\n\n".join(pages).strip()
        if text:
            return text
    except Exception:
        pass

    # 2. Tentar pdfplumber
    try:
        import pdfplumber  # type: ignore

        with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
            text = "\n\n".join(pages).strip()
            if text:
                return text
    except Exception:
        pass

    # 3. Tentar PyPDF2
    try:
        import PyPDF2  # type: ignore

        reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
        pages = [p.extract_text() or "" for p in reader.pages]
        text = "\n\n".join(pages).strip()
        if text:
            return text
    except Exception:
        pass

    raise ValueError(
        "Não foi possível extrair o texto do arquivo PDF. Certifique-se de que o documento não é uma imagem escaneada sem OCR."
    )


def _extract_docx(content_bytes: bytes) -> str:
    # 1. Tentar via python-docx se instalado
    try:
        import docx  # type: ignore

        doc = docx.Document(io.BytesIO(content_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        text = "\n\n".join(paragraphs).strip()
        if text:
            return text
    except Exception:
        pass

    # 2. Extração Nativa de Alta Precisão via zipfile + XML (zero dependências externas)
    try:
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
            xml_data = z.read("word/document.xml")
        tree = ET.fromstring(xml_data)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs = []
        for p in tree.iter(f"{{{ns['w']}}}p"):
            texts = [t.text for t in p.iter(f"{{{ns['w']}}}t") if t.text]
            if texts:
                full_p = "".join(texts).strip()
                if full_p:
                    paragraphs.append(full_p)
        text = "\n\n".join(paragraphs).strip()
        if text:
            return text
    except Exception as e:
        raise ValueError(f"Falha ao ler arquivo DOCX: {e}")

    raise ValueError("O arquivo DOCX não contém parágrafos legíveis de texto.")


def clean_statute_text(raw: str) -> str:
    """Normaliza espaçamentos, quebras de linha e hífens de quebra de palavra."""
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    # Remover hífens de fim de linha (ex: coope-\nrativa -> cooperativa)
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)
    # Remover múltiplos espaços horizontais
    text = re.sub(r"[ \t]+", " ", text)
    # Remover cabeçalhos/rodapés repetitivos de página (ex: "Página 12 de 45")
    text = re.sub(r"(?im)^\s*p[áa]gina\s+\d+(?:\s*(?:de|\/)\s*\d+)?\s*$", "", text)
    # Reduzir excesso de quebras de linha
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_keywords_from_chunk(title: str, content: str, max_words: int = 7) -> str:
    """Extrai palavras-chave essenciais para busca e indexação semântica no PostgreSQL."""
    combined = f"{title} {content[:400]}"
    normalized = unicodedata.normalize("NFKD", combined.lower())
    clean = "".join(c for c in normalized if c.isalnum() or c.isspace())
    tokens = clean.split()
    seen = set()
    keywords = []
    for t in tokens:
        if len(t) >= 4 and t not in _STOPWORDS and t not in seen and not t.isdigit():
            seen.add(t)
            keywords.append(t)
            if len(keywords) >= max_words:
                break
    return ", ".join(keywords)


def split_statute_into_chunks(
    raw_text: str,
    filename: str = "",
    default_category: str = "REGULAMENTO_ESTATUTO",
    max_chunk_chars: int = 1400,
) -> List[Dict[str, Any]]:
    """
    Particiona o texto de um estatuto social ou regulamento em blocos semânticos (chunks).
    Identifica artigos (Art. 1º, Artigo 2º...), Capítulos, Seções e Cláusulas.
    Garante que cada chunk contenha título claro, categoria e palavras-chave.
    """
    cleaned = clean_statute_text(raw_text)
    if not cleaned:
        return []

    # 1. Tentar divisão estruturada por artigos/capítulos
    raw_parts = _ARTICLE_SPLIT_RE.split(cleaned)
    # Filtrar blocos vazios
    parts = [p.strip() for p in raw_parts if p.strip()]

    chunks: List[Dict[str, Any]] = []
    current_chapter = ""

    # Se identificou pelo menos 2 artigos/cláusulas
    if len(parts) >= 2:
        for p in parts:
            first_line = p.split("\n", 1)[0].strip()

            # Se for um marcador de Capítulo/Seção, guardar como contexto
            if re.match(r"(?i)^(cap[íi]tulo|se[çc][ãa]o|t[íi]tulo)\b", first_line):
                current_chapter = first_line[:120].strip()
                # Se o bloco for só o título do capítulo, continua
                body = p[len(first_line):].strip()
                if not body:
                    continue

            # Extrair título do artigo
            m = _ARTICLE_HEADER_RE.match(first_line)
            if m:
                art_id = m.group(1).strip()
                art_subtitle = (m.group(2) or "").strip()
                if art_subtitle:
                    title = f"{art_id} - {art_subtitle}"[:190]
                elif current_chapter:
                    title = f"{art_id} ({current_chapter})"[:190]
                else:
                    title = art_id[:190]
            else:
                title = first_line[:120].strip() or "Diretriz Estatutária"

            # Se o artigo for muito grande, dividir em partes
            if len(p) > max_chunk_chars:
                sub_chunks = _split_long_text(p, max_chunk_chars)
                for idx, sub in enumerate(sub_chunks, start=1):
                    sub_title = f"{title} (Parte {idx})"[:190]
                    kw = extract_keywords_from_chunk(sub_title, sub)
                    chunks.append({
                        "title": sub_title,
                        "category": default_category,
                        "content": sub,
                        "keywords": kw,
                    })
            else:
                kw = extract_keywords_from_chunk(title, p)
                chunks.append({
                    "title": title,
                    "category": default_category,
                    "content": p,
                    "keywords": kw,
                })

        if chunks:
            return chunks

    # 2. Fallback: Caso o documento não utilize marcação tradicional "Art.",
    # fatia por blocos coerentes de parágrafos
    return _chunk_by_paragraphs(cleaned, filename, default_category, max_chunk_chars)


def _split_long_text(text: str, max_chars: int) -> List[str]:
    """Divide um texto longo respeitando parágrafos ou frases."""
    paragraphs = text.split("\n\n")
    results = []
    current: List[str] = []
    current_len = 0

    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        if current_len + len(p_clean) + 2 > max_chars and current:
            results.append("\n\n".join(current))
            current = [p_clean]
            current_len = len(p_clean)
        else:
            current.append(p_clean)
            current_len += len(p_clean) + 2

    if current:
        results.append("\n\n".join(current))
    return results or [text]


def _chunk_by_paragraphs(
    text: str,
    filename: str,
    category: str,
    max_chars: int,
) -> List[Dict[str, Any]]:
    """Gera chunks sequenciais com sobreposição quando não há artigos explícitos."""
    base_name = (filename.rsplit(".", 1)[0] if "." in filename else filename) or "Estatuto"
    base_name = re.sub(r"[_\-]+", " ", base_name).title()[:60]

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[Dict[str, Any]] = []
    buffer: List[str] = []
    buffer_len = 0
    chunk_index = 1

    for p in paragraphs:
        if buffer_len + len(p) + 2 > max_chars and buffer:
            chunk_content = "\n\n".join(buffer)
            first_line = buffer[0].split("\n")[0][:80]
            title = f"{base_name} - Seção {chunk_index} ({first_line})"[:190]
            kw = extract_keywords_from_chunk(title, chunk_content)
            chunks.append({
                "title": title,
                "category": category,
                "content": chunk_content,
                "keywords": kw,
            })
            chunk_index += 1
            buffer = [p]
            buffer_len = len(p)
        else:
            buffer.append(p)
            buffer_len += len(p) + 2

    if buffer:
        chunk_content = "\n\n".join(buffer)
        first_line = buffer[0].split("\n")[0][:80]
        title = f"{base_name} - Seção {chunk_index} ({first_line})"[:190]
        kw = extract_keywords_from_chunk(title, chunk_content)
        chunks.append({
            "title": title,
            "category": category,
            "content": chunk_content,
            "keywords": kw,
        })

    return chunks
