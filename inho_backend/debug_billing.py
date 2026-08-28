import asyncio
import uuid
from db.session import AsyncSessionLocal
from sqlalchemy import select
from models.models import User, Business, BillingInvoice
from routers.billing import _get_user_business

async def debug():
    async with AsyncSessionLocal() as db:
        # Get the test user
        result = await db.execute(select(User).where(User.email == "test_colab_1786883014@orbe.com"))
        user = result.scalar_one_or_none()
        print("User:", user)
        
        if user:
            try:
                business = await _get_user_business(db, user)
                print("Business:", business)
            except Exception as e:
                print("Error in _get_user_business:", e)
                import traceback
                traceback.print_exc()
            
            # Check invoices directly
            result = await db.execute(select(BillingInvoice))
            invoices = result.scalars().all()
            print("Total invoices:", len(invoices))
            for inv in invoices:
                print(f"  Invoice: {inv.id}, business_id: {inv.business_id}, customer: {inv.customer_name}")

asyncio.run(debug())