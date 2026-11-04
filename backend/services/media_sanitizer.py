"""EXIF stripping para uploads da Mesh (Manual 11, secao 4 / Fase 3).

Reconstroi a imagem apenas com os pixels, descartando EXIF (GPS, modelo de camera),
XMP e IPTC. A orientacao EXIF e aplicada antes, para a foto nao sair girada.
"""
from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass

from PIL import Image, ImageOps

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


@dataclass(frozen=True)
class SanitizedImage:
    data: bytes
    format: str
    sha256: str
    had_gps: bool


def _has_gps(img: Image.Image) -> bool:
    try:
        return 0x8825 in img.getexif()  # GPSInfo IFD
    except Exception:
        return False


def strip_exif(raw: bytes) -> SanitizedImage:
    with Image.open(io.BytesIO(raw)) as img:
        fmt = (img.format or "").upper()
        if fmt not in ALLOWED_FORMATS:
            raise ValueError(f"Formato nao suportado: {fmt or 'desconhecido'}")
        had_gps = _has_gps(img)
        img = ImageOps.exif_transpose(img)
        clean = Image.new(img.mode, img.size)
        clean.putdata(list(img.getdata()))
        out = io.BytesIO()
        save_kwargs = {"quality": 90} if fmt in {"JPEG", "WEBP"} else {}
        clean.save(out, format=fmt, **save_kwargs)  # sem exif=/icc: nada e propagado
    data = out.getvalue()
    return SanitizedImage(data, fmt, hashlib.sha256(data).hexdigest(), had_gps)
