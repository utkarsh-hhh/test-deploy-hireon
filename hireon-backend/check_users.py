import asyncio
from app.database import SessionLocal
from app.models.user import User
from sqlalchemy import select

async def check_users():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.full_name}, Email: {u.email}, Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(check_users())
