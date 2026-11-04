"""Catalogo por ISBN-13 e regras puras da Mesh Books (Manual 11, secao 5).

- Validacao de ISBN-13 (checksum) e conversao de ISBN-10.
- Busca hibrida Google Books -> OpenLibrary, com fetcher injetavel (testavel offline).
- mask_spoilers: oculta notas cujo progress_threshold excede o progresso do leitor.
"""
from __future__ import annotations

import json
import re
import urllib.request
from typing import Callable

Fetcher = Callable[[str], dict]


def _default_fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "OrbeSystems-MeshBooks/1.0"})
    with urllib.request.urlopen(req, timeout=5) as r:  # noqa: S310 (URLs fixas abaixo)
        return json.loads(r.read().decode("utf-8"))


def normalize_isbn(value: str) -> str | None:
    """Retorna ISBN-13 valido (so digitos) ou None. Aceita ISBN-10 e hifens."""
    s = re.sub(r"[\s-]", "", value or "").upper()
    if re.fullmatch(r"\d{9}[\dX]", s):
        core = "978" + s[:9]
        s = core + _check13(core)
    if not re.fullmatch(r"\d{13}", s):
        return None
    return s if s[-1] == _check13(s[:12]) else None


def _check13(first12: str) -> str:
    total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(first12))
    return str((10 - total % 10) % 10)


def lookup_isbn(isbn: str, fetch: Fetcher = _default_fetch) -> dict | None:
    """{isbn13,title,authors,cover_url,source} ou None. Falha de uma fonte cai para a outra."""
    isbn13 = normalize_isbn(isbn)
    if not isbn13:
        return None
    try:
        data = fetch(f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn13}")
        items = data.get("items") or []
        if items:
            v = items[0].get("volumeInfo", {})
            return {
                "isbn13": isbn13,
                "title": v.get("title", ""),
                "authors": v.get("authors", []),
                "cover_url": (v.get("imageLinks") or {}).get("thumbnail"),
                "source": "google_books",
            }
    except Exception:
        pass
    try:
        key = f"ISBN:{isbn13}"
        data = fetch(f"https://openlibrary.org/api/books?bibkeys={key}&format=json&jscmd=data")
        b = data.get(key)
        if b:
            return {
                "isbn13": isbn13,
                "title": b.get("title", ""),
                "authors": [a.get("name", "") for a in b.get("authors", [])],
                "cover_url": (b.get("cover") or {}).get("medium"),
                "source": "openlibrary",
            }
    except Exception:
        pass
    return None


def mask_spoilers(notes: list[dict], reader_progress: float) -> list[dict]:
    """Notas com progress_threshold > progresso do leitor perdem o corpo (anti-spoiler)."""
    out = []
    for n in notes:
        if n["progress_threshold"] > reader_progress:
            out.append({**n, "body": None, "masked": True})
        else:
            out.append({**n, "masked": False})
    return out
