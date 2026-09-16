from db.session import AsyncSessionLocal
from models.models import AuditLog, AuditAction
from uuid import uuid4
import datetime

async def seed_data():
    async with AsyncSessionLocal() as db:
        logs = [
            AuditLog(
                user_id=str(uuid4()),
                action=AuditAction.CREATE,
                entity="Cooperado",
                entity_id=str(uuid4()),
                detail="Created new partner profile",
                ip_address="192.168.1.1",
                timestamp=datetime.datetime.now(datetime.timezone.utc)
            ),
            AuditLog(
                user_id=str(uuid4()),
                action=AuditAction.UPDATE,
                entity="BillingInvoice",
                entity_id=str(uuid4()),
                detail="Paid invoice",
                ip_address="192.168.1.1",
                timestamp=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
            ),
            AuditLog(
                user_id=str(uuid4()),
                action=AuditAction.LOGIN,
                entity="Auth",
                entity_id=None,
                detail="User logged in",
                ip_address="192.168.1.1",
                timestamp=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=5)
            )
        ]
        db.add_all(logs)
        await db.commit()
        print("Seeded successfully")

if __name__ == "__main__":
    asyncio.run(seed_data())
