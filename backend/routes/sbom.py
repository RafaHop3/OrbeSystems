"""
routes/sbom.py — SBOM API Endpoint
════════════════════════════════════
Admin-protected endpoints to inspect the generated SBOM.
"""
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from security.auth import get_current_admin_user

router = APIRouter()

_SBOM_PATH = os.path.join(os.path.dirname(__file__), "..", "sbom-backend.json")


def _load_sbom() -> dict:
    path = os.path.abspath(_SBOM_PATH)
    if not os.path.exists(path):
        raise HTTPException(
            status_code=404,
            detail="SBOM not generated yet. Run: python backend/sbom_generator.py"
        )
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/sbom")
async def get_sbom(admin: str = Depends(get_current_admin_user)):
    """Full CycloneDX 1.4 SBOM for the backend."""
    return _load_sbom()


@router.get("/sbom/licenses")
async def list_licenses(admin: str = Depends(get_current_admin_user)):
    """Summary of all licenses with counts and GPL flag."""
    sbom = _load_sbom()
    meta = sbom.get("_orbe_meta", {})
    return {
        "license_summary":  meta.get("license_summary", {}),
        "gpl_flagged":      meta.get("gpl_flagged", []),
        "requires_review":  meta.get("requires_review", False),
        "total_components": meta.get("total_dependencies", 0),
    }
