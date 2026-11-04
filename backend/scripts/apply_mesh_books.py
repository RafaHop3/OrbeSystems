"""Aplica mesh_social_isolated_schema.sql + mesh_books_schema.sql numa UNICA transacao, com verificacao
de NAO-INTERFERENCIA nos demais schemas (public, inho, ...).

Uso:  python apply_mesh_books.py            # dry-run: aplica, verifica, ROLLBACK
      python apply_mesh_books.py --commit   # aplica de fato
Env:  DATABASE_URL (nunca impresso), MESH_SQL_DIR (pasta com os .sql; padrao: raiz do repo)
So PostgreSQL. A role mesh_service_role e criada NOLOGIN e sem senha (a senha de exemplo do .sql e removida).
"""
import os, re, sys
from pathlib import Path
from sqlalchemy import create_engine, text

SQL_DIR = Path(os.environ.get("MESH_SQL_DIR") or Path(__file__).resolve().parents[2])
FILES = ["mesh_social_isolated_schema.sql", "mesh_books_schema.sql"]
OWN = ("mesh_network", "mesh_books")
SNAP = """SELECT n.nspname, count(c.oid) FROM pg_namespace n LEFT JOIN pg_class c ON c.relnamespace = n.oid
          WHERE n.nspname NOT IN ('mesh_network','mesh_books') AND n.nspname NOT LIKE 'pg\\_%' AND n.nspname <> 'information_schema'
          GROUP BY 1 ORDER BY 1"""


def load_sql() -> str:
    parts = [(SQL_DIR / f).read_text(encoding="utf-8-sig") for f in FILES]
    first, n = re.subn(r"CREATE ROLE mesh_service_role WITH LOGIN PASSWORD '[^']*';",
                       "CREATE ROLE mesh_service_role NOLOGIN;", parts[0])
    if n != 1:
        raise SystemExit("ABORTADO: nao encontrei o CREATE ROLE com senha para neutralizar")
    parts[0] = first
    return "\n".join(parts)


def main(commit: bool) -> int:
    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith(("postgres://", "postgresql")):
        print("DATABASE_URL deve ser PostgreSQL."); return 2
    eng = create_engine(url.replace("postgres://", "postgresql://", 1))
    sql = load_sql()
    with eng.connect() as cx:
        tx = cx.begin()
        before = cx.execute(text(SNAP)).fetchall()
        cx.exec_driver_sql(sql)
        after = cx.execute(text(SNAP)).fetchall()
        rls_off = cx.execute(text("""SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              WHERE n.nspname IN ('mesh_network','mesh_books') AND c.relkind='r' AND NOT c.relrowsecurity""")).fetchall()
        pub = cx.execute(text("""SELECT bool_or(has_schema_privilege('public', s, 'USAGE'))
              FROM unnest(ARRAY['mesh_network','mesh_books']) s""")).scalar()
        can_login = cx.execute(text("SELECT rolcanlogin FROM pg_roles WHERE rolname='mesh_service_role'")).scalar()
        n_tables = cx.execute(text("""SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              WHERE n.nspname IN ('mesh_network','mesh_books') AND c.relkind='r'""")).scalar()
        problems = []
        if before != after: problems.append("outros schemas mudaram")
        if rls_off: problems.append(f"RLS desligado em {rls_off}")
        if pub: problems.append("USAGE publico em schema Mesh")
        if can_login: problems.append("mesh_service_role pode logar")
        if problems:
            tx.rollback(); print("ABORTADO:", "; ".join(problems)); return 1
        print(f"OK: {n_tables} tabelas Mesh criadas; outros schemas intactos ({len(before)} conferidos); "
              "RLS ativo em todas; sem acesso publico; role NOLOGIN sem senha.")
        if commit:
            tx.commit(); print("COMMIT feito.")
        else:
            tx.rollback(); print("Dry-run: ROLLBACK (nada gravado). Use --commit para aplicar.")
    return 0


if __name__ == "__main__":
    sys.exit(main("--commit" in sys.argv))