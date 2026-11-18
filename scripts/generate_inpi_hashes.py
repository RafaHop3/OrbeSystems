"""
Orbe Systems — Gerador Determinístico de Hashes SHA-256 para Registro e-Software INPI
Calcula hashes SHA-256 (com normalização LF determinística e bruto) dos módulos proprietários:
- Transpilador AST-SSA/Z3 (backend/imortal/*)
- Motor OrbeJobs Zero-Key + IMORTAL Predictive Cascade Router (inho_backend)
Gera manifesto JSON e relatório TXT em documentos_legais/inpi/.
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parent.parent

TARGET_GROUPS = {
    "TRANSPILADOR_IMORTAL_AST_SSA_Z3": [
        "backend/imortal/__init__.py",
        "backend/imortal/ai.py",
        "backend/imortal/cli.py",
        "backend/imortal/compiler.py",
        "backend/imortal/config.py",
        "backend/imortal/ir.py",
        "backend/imortal/prover.py",
        "backend/imortal/sandbox.py",
        "backend/imortal/server.py",
        "backend/imortal/visualizer.py",
        "backend/routes/imortal.py",
    ],
    "ORBEJOBS_ZERO_KEY_IMORTAL_CASCADE": [
        "inho_backend/services/ai_agent.py",
        "inho_backend/services/orbejobs_scraper.py",
        "inho_backend/services/orbejobs_service.py",
        "inho_backend/services/orbejobs_mailer.py",
        "inho_backend/routers/orbejobs.py",
        "inho_backend/core/security.py",
    ],
}


def sha256_file_hashes(path: Path) -> Dict[str, Any]:
    raw_bytes = path.read_bytes()
    raw_sha256 = hashlib.sha256(raw_bytes).hexdigest()
    normalized_bytes = raw_bytes.replace(b"\r\n", b"\n")
    lf_sha256 = hashlib.sha256(normalized_bytes).hexdigest()
    return {
        "path": path.relative_to(REPO_ROOT).as_posix(),
        "size_bytes": len(raw_bytes),
        "lines": normalized_bytes.count(b"\n") + (1 if normalized_bytes and not normalized_bytes.endswith(b"\n") else 0),
        "sha256_raw": raw_sha256,
        "sha256_canonical_lf": lf_sha256,
    }


def generate_manifest() -> Dict[str, Any]:
    groups_out: Dict[str, Any] = {}
    all_hashes_concat: List[str] = []

    for group_name, rel_paths in TARGET_GROUPS.items():
        entries: List[Dict[str, Any]] = []
        for rel in rel_paths:
            full = REPO_ROOT / rel
            if not full.exists():
                continue
            info = sha256_file_hashes(full)
            entries.append(info)
            all_hashes_concat.append(f"{info['path']}:{info['sha256_canonical_lf']}")

        bundle_digest = hashlib.sha256(
            "\n".join(f"{e['path']}:{e['sha256_canonical_lf']}" for e in entries).encode("utf-8")
        ).hexdigest()
        groups_out[group_name] = {
            "files_count": len(entries),
            "bundle_sha256": bundle_digest,
            "files": entries,
        }

    master_digest = hashlib.sha256("\n".join(sorted(all_hashes_concat)).encode("utf-8")).hexdigest()
    manifest = {
        "schema": "ORBE-INPI-E-SOFTWARE-V1",
        "holder": "ORBE SYSTEMS LTDA",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "hash_algorithm": "SHA-256",
        "master_bundle_sha256": master_digest,
        "groups": groups_out,
    }

    out_dir = REPO_ROOT / "documentos_legais" / "inpi"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "INPI_E_SOFTWARE_MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    txt_lines = [
        "ORBE SYSTEMS LTDA — REGISTRO E-SOFTWARE INPI (HASH SHA-256)",
        f"Gerado em (UTC): {manifest['generated_at_utc']}",
        f"Master Bundle SHA-256: {master_digest}",
        "=" * 78,
    ]
    for g_name, g_data in groups_out.items():
        txt_lines.append(f"\n[{g_name}] Bundle SHA-256: {g_data['bundle_sha256']}")
        for f_info in g_data["files"]:
            txt_lines.append(
                f"  {f_info['sha256_canonical_lf']}  {f_info['path']} ({f_info['lines']} linhas, {f_info['size_bytes']} bytes)"
            )
    (out_dir / "INPI_E_SOFTWARE_HASHES.txt").write_text("\n".join(txt_lines) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    result = generate_manifest()
    print(f"Manifesto INPI gerado com Master SHA-256: {result['master_bundle_sha256']}")
