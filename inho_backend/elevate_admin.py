import asyncio
import os
from sqlalchemy import select, update
from db.session import async_session
from models.models import User, UserRole

async def elevate_user(email: str):
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"Error: User with email {email} not found.")
            return

        print(f"[{email}] Current Role: {user.role.value if hasattr(user.role, 'value') else user.role}")
        
        user.role = UserRole.SUPER_ADMIN
        session.add(user)
        await session.commit()
        
        print(f"[{email}] Role successfully elevated to SUPER_ADMIN!")

if __name__ == "__main__":
    email_to_elevate = input("Enter the email to elevate (e.g. admin@inho.com): ").strip()
    if email_to_elevate:
        asyncio.run(elevate_user(email_to_elevate))
    else:
        print("No email provided.")
