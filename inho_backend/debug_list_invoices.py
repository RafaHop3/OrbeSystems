import asyncio
from db.session import AsyncSessionLocal
from routers.billing import list_invoices
from models.models import User
from sqlalchemy import select

async def debug_list():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "test_colab_1786883014@orbe.com"))
        user = result.scalar_one_or_none()
        print("User:", user)
        
        # Create a mock request object
        class MockRequest:
            pass
        
        try:
            # Call the list_invoices function directly
            invoices = await list_invoices(
                status_filter=None,
                db=db,
                current_user=user
            )
            print("Invoices:", invoices)
            for inv in invoices:
                print(f"  {inv}")
        except Exception as e:
            print("Error:", e)
            import traceback
            traceback.print_exc()

asyncio.run(debug_list())