
import asyncio
import os
import sys

# Ensure the backend directory is in the python path
sys.path.append(os.path.join(os.getcwd(), "hireon-backend"))

from app.database import SessionLocal
from app.models.candidate import Candidate
from app.models.job import Job
from sqlalchemy import select
from app.utils.permissions import JobStatus
from app.services.match_scorer import compute_match_score

async def run_suggestions():
    async with SessionLocal() as db:
        # Get one active job
        jobs_res = await db.execute(
            select(Job).where(Job.status == JobStatus.ACTIVE).limit(1)
        )
        job = jobs_res.scalar_one_or_none()
        
        if not job:
            print("No active jobs found in DB.")
            return

        print(f"Checking matches for Job: {job.title}")
        
        # Get some candidates
        candidates_res = await db.execute(select(Candidate).limit(10))
        candidates = candidates_res.scalars().all()
        
        if not candidates:
            print("No candidates found in DB.")
            return

        for cand in candidates:
            score = await compute_match_score(
                cand.skills,
                cand.parsed_data or {},
                cand.years_experience,
                job
            )
            print(f"  Candidate: {cand.full_name} -> Score: {score}")

if __name__ == "__main__":
    asyncio.run(run_suggestions())
