import asyncio
from app.database import engine
from sqlalchemy import text

async def clear_all():
    async with engine.begin() as conn:
        tables = [
            "notifications", "scorecards", "offers",
            "interview_panelists", "interviews",
            "applications", "candidates",
            "refresh_tokens", "jobs", "users", "organizations",
        ]
        for t in tables:
            await conn.execute(text(f'TRUNCATE TABLE "{t}" CASCADE'))
            print(f"Truncated {t}")

if __name__ == "__main__":
    print("Clearing database...")
    asyncio.run(clear_all())
    print("Database cleared successfully.")
