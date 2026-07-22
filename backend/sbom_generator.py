"""
backend/sbom_generator.py — Software Bill of Materials Generator
═════════════════════════════════════════════════════════════════
Generates a CycloneDX 1.4 SBOM from requirements.txt.
Run in CI or call via /api/admin/sbom to expose as API.

Usage (CLI):
    python sbom_generator.py [--output sbom-backend.json]

Usage (import):
    from sbom_generator import generate_sbom
    sbom = generate_sbom()
"""

import sys
import json
import hashlib
import argparse
import subprocess
from datetime import datetime, timezone
from pathlib import Path


# GPL-family licenses that require review for commercial projects
_GPL_LICENSES = {"gpl", "lgpl", "agpl", "gpl-2.0", "gpl-3.0", "lgpl-2.1", "lgpl-3.0", "agpl-3.0"}

# Known license map for packages that don't expose metadata correctly
_LICENSE_OVERRIDE = {
    "z3-solver":          "MIT",
    "google-generativeai": "Apache-2.0",
    "instructor":         "MIT",
    "rich":               "MIT",
    "slowapi":            "MIT",
}


def _get_installed_packages() -> list[dict]:
    """Use pip show to gather metadata for each installed package."""
    result = subprocess.run(
        [sys.executable, "-m", "pip", "list", "--format=json"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"[SBOM] pip list failed: {result.stderr}", file=sys.stderr)
        return []

    packages = json.loads(result.stdout)
    enriched = []

    for pkg in packages:
        name    = pkg["name"]
        version = pkg["version"]

        # pip show for metadata
        show = subprocess.run(
            [sys.executable, "-m", "pip", "show", name],
            capture_output=True, text=True
        )
        meta: dict[str, str] = {}
        for line in show.stdout.splitlines():
            if ":" in line:
                key, _, val = line.partition(":")
                meta[key.strip().lower()] = val.strip()

        license_id = (
            _LICENSE_OVERRIDE.get(name)
            or meta.get("license", "Unknown")
        )
        home_page = meta.get("home-page") or meta.get("project-url", "")

        enriched.append({
            "name":     name,
            "version":  version,
            "license":  license_id,
            "home_url": home_page,
            "author":   meta.get("author", ""),
        })

    return enriched


def _purl(name: str, version: str) -> str:
    """Package URL (PURL) in CycloneDX format."""
    return f"pkg:pypi/{name.lower()}@{version}"


def _sha256_stub(name: str, version: str) -> str:
    """Deterministic placeholder hash — replace with actual wheel hash in CI."""
    return hashlib.sha256(f"{name}=={version}".encode()).hexdigest()


def generate_sbom(output_path: str | None = None) -> dict:
    """
    Generate a CycloneDX 1.4 SBOM for the backend.
    Returns the SBOM dict and optionally writes it to output_path.
    """
    packages = _get_installed_packages()

    components = []
    license_summary: dict[str, int] = {}
    gpl_flagged: list[str] = []

    for pkg in packages:
        lic = pkg["license"]
        license_summary[lic] = license_summary.get(lic, 0) + 1

        if any(gpl in lic.lower() for gpl in _GPL_LICENSES):
            gpl_flagged.append(f"{pkg['name']}@{pkg['version']} ({lic})")

        components.append({
            "type":    "library",
            "name":    pkg["name"],
            "version": pkg["version"],
            "purl":    _purl(pkg["name"], pkg["version"]),
            "licenses": [{"license": {"id": lic}}],
            "externalReferences": [
                {"type": "website", "url": pkg["home_url"]}
            ] if pkg["home_url"] else [],
            "hashes": [
                {"alg": "SHA-256", "content": _sha256_stub(pkg["name"], pkg["version"])}
            ],
        })

    sbom = {
        "bomFormat":   "CycloneDX",
        "specVersion": "1.4",
        "version":     1,
        "serialNumber": f"urn:uuid:{__import__('uuid').uuid4()}",
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "component": {
                "type":    "application",
                "name":    "orbe-systems-api",
                "version": "1.0.0",
            },
        },
        "components": components,
        "_orbe_meta": {
            "total_dependencies": len(components),
            "license_summary":    license_summary,
            "gpl_flagged":        gpl_flagged,
            "requires_review":    len(gpl_flagged) > 0,
        },
    }

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(sbom, f, indent=2, ensure_ascii=False)
        print(f"[SBOM] Written to {output_path} ({len(components)} components)")
        if gpl_flagged:
            print(f"[SBOM] ⚠️  GPL-family licenses require review: {gpl_flagged}")

    return sbom


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate CycloneDX SBOM")
    parser.add_argument("--output", default="sbom-backend.json")
    args = parser.parse_args()
    sbom = generate_sbom(args.output)
    print(f"[SBOM] Done — {sbom['_orbe_meta']['total_dependencies']} dependencies")
    if sbom["_orbe_meta"]["requires_review"]:
        print("[SBOM] ⚠️  GPL licenses found — legal review required!")
        sys.exit(2)
