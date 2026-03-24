import asyncio
from app.database import AsyncSessionLocal as SessionLocal
from app.models.candidate import Candidate
from app.models.job import Job
from sqlalchemy import select

async def check():
    async with SessionLocal() as db:
        jobs = (await db.execute(select(Job))).scalars().all()
        cands = (await db.execute(select(Candidate))).scalars().all()
        print(f"Jobs found: {len(jobs)}")
        for j in jobs:
            print(f"  - {j.title} (ID: {j.id}, Status: {j.status})")
        print(f"Candidates found: {len(cands)}")
        for c in cands:
            print(f"  - {c.full_name} (Skills: {c.skills})")

if __name__ == "__main__":
    asyncio.run(check())
