"""
Orbe Systems — Verificador Objetivo do Benchmark de Modelos (Hydrogen vs Argon)
Executa checagens automáticas no ecossistema (flake8, pytest OrbeJobs/CBM, tsc --noEmit e regra SEC-01)
para pontuar objetivamente as entregas de cada modelo sem subjetividade.
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple

ORBE_REPO = Path(__file__).resolve().parent.parent.parent
INHO_BACKEND = ORBE_REPO / "inho_backend"
INHO_FRONTEND = ORBE_REPO.parent / "inho_frontend"
BACKEND_PYTHON = INHO_BACKEND / ".venv" / "Scripts" / "python.exe"

FORBIDDEN_SEC01_TERMS = ("google gemini", "gemini 1.5 flash", "gemini 2.0")


def _run(cmd: List[str], cwd: Path, extra_env: dict | None = None) -> Tuple[int, str]:
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    return proc.returncode, output.strip()


def check_sec01_frontend() -> Tuple[bool, str]:
    violations: List[str] = []
    src_dir = INHO_FRONTEND / "src"
    if not src_dir.exists():
        return False, f"Diretório não encontrado: {src_dir}"
    for ext in ("*.ts", "*.tsx"):
        for fpath in src_dir.rglob(ext):
            content = fpath.read_text(encoding="utf-8", errors="ignore").lower()
            for term in FORBIDDEN_SEC01_TERMS:
                if term in content:
                    violations.append(f"{fpath.relative_to(INHO_FRONTEND)}: contém '{term}'")
    if violations:
        return False, "; ".join(violations[:5])
    return True, "Zero vazamentos de marcas externas (SEC-01 OK)"


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark Verifier — Orbe Systems")
    parser.add_argument("--label", default="Modelo", help="Nome do modelo avaliado (ex: Hydrogen, Argon)")
    parser.add_argument("--skip-pytest", action="store_true", help="Pula pytest (execução rápida)")
    args = parser.parse_args()

    py_exe = str(BACKEND_PYTHON if BACKEND_PYTHON.exists() else sys.executable)
    results: List[Tuple[str, bool, str]] = []

    # 1. Flake8 crítico (CI gate)
    rc_f8, out_f8 = _run(
        [py_exe, "-m", "flake8", ".", "--count", "--select=E9,F63,F7,F82", "--exclude=.venv,venv,test_venv,__pycache__"],
        cwd=INHO_BACKEND,
    )
    results.append(("Backend Flake8 (E9,F63,F7,F82)", rc_f8 == 0, out_f8.splitlines()[-1] if out_f8 else "ok"))

    # 2. Pytest OrbeJobs + CBM
    if not args.skip_pytest:
        test_env = {
            "DATABASE_URL": "sqlite+aiosqlite:///./test_inho.db",
            "SECRET_KEY": "ci-testing-jwt-secret-key-32chars-min",
            "FERNET_KEYS": "t_ci_fernet_key_mock_32_bytes_base64_hash=",
            "INHO_SYSTEM_SECRET": "ci-inho-system-secret-token",
        }
        rc_pt, out_pt = _run(
            [py_exe, "-m", "pytest", "-q", "tests/test_orbejobs.py", "tests/test_cbm_and_orbrick_ai.py"],
            cwd=INHO_BACKEND,
            extra_env=test_env,
        )
        last_line = out_pt.splitlines()[-1] if out_pt else ""
        results.append(("Backend Pytest (OrbeJobs + CBM)", rc_pt == 0, last_line))

    # 3. Frontend TypeScript
    if INHO_FRONTEND.exists():
        tsc_cmd = ["cmd.exe", "/c", "npx", "tsc", "--noEmit"] if os.name == "nt" else ["npx", "tsc", "--noEmit"]
        rc_tsc, out_tsc = _run(tsc_cmd, cwd=INHO_FRONTEND)
        results.append(("Frontend TypeScript (tsc --noEmit)", rc_tsc == 0, out_tsc[:180] or "0 errors"))

        # 4. SEC-01 Check
        ok_sec, msg_sec = check_sec01_frontend()
        results.append(("Frontend Regra SEC-01", ok_sec, msg_sec))

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n=== Resultado Benchmark [{args.label}] ({passed}/{len(results)} gates OK) ===")
    for name, ok, detail in results:
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {name} -> {detail}")

    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
