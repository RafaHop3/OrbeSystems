import asyncio
from db.session import SessionLocal
from models.models import AuditLog
from sqlalchemy import select

async def main():
    try:
        async with SessionLocal() as db:
            print("Fetching...")
            query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(2)
            result = await db.execute(query)
            logs = result.scalars().all()
            print("Fetched logs:", [l.id for l in logs])
            from schemas.schemas import AuditLogOut
            for l in logs:
                print("Parsing", l.id)
                AuditLogOut.model_validate(l)
            print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
