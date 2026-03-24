"""
HireOn — Interviewer Dashboard Demo Seed (Enhanced for Prep Kit)
Run: python seed_interviewer_demo.py

Populates data for:
- 3 Job Positions from JDs
- 10 Candidates from Resumes (with full profiles)
- Interviews scheduled for 'interviewer@brainerhub.com'
- Scorecards and Mock Resumes
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.organization import Organization
from app.models.user import User
from app.models.job import Job
from app.models.candidate import Candidate
from app.models.application import Application
from app.models.interview import Interview, InterviewPanelist
from app.models.scorecard import Scorecard
from app.utils.permissions import (
    UserRole, JobStatus, ApplicationStage,
    InterviewType, InterviewStatus
)
from app.utils.security import hash_password
import app.models  # noqa

engine = create_async_engine(settings.database_url)
Session = async_sessionmaker(engine, expire_on_commit=False)

NOW = datetime.now(timezone.utc)

def ago(**kwargs):
    return NOW - timedelta(**kwargs)

def future(**kwargs):
    return NOW + timedelta(**kwargs)

async def seed():
    async with Session() as db:
        print("\n🌱 HireOn — Seeding Enhanced Interviewer Demo Data...\n")

        # 1. Organization
        org_result = await db.execute(text("SELECT id FROM organizations WHERE slug = 'brainerhub'"))
        org_id = org_result.scalar()
        
        if org_id:
            print(f"  - Cleaning up existing demo data for Brainerhub...")
            await db.execute(text(f"DELETE FROM scorecards WHERE organization_id = '{org_id}'"))
            await db.execute(text(f"DELETE FROM interview_panelists WHERE interview_id IN (SELECT id FROM interviews WHERE organization_id = '{org_id}')"))
            await db.execute(text(f"DELETE FROM interviews WHERE organization_id = '{org_id}'"))
            await db.execute(text(f"DELETE FROM applications WHERE organization_id = '{org_id}'"))
            await db.execute(text(f"DELETE FROM candidates WHERE organization_id = '{org_id}'"))
            await db.execute(text(f"DELETE FROM jobs WHERE organization_id = '{org_id}'"))
            await db.commit()
            print(f"  ✓ Cleanup Complete")
        else:
            org = Organization(
                name="Brainerhub",
                slug="brainerhub",
                industry="Technology",
                size="51-200",
                is_active=True,
            )
            db.add(org)
            await db.flush()
            org_id = org.id
            print(f"  ✓ Created Organization: {org.name}")

        # 2. Users (Ensure they exist)
        users_data = [
            {"email": "admin@brainerhub.com", "name": "Admin", "role": UserRole.ADMIN},
            {"email": "recruiter@brainerhub.com", "name": "Bob Recruiter", "role": UserRole.RECRUITER},
            {"email": "interviewer@brainerhub.com", "name": "Carol Interviewer", "role": UserRole.INTERVIEWER},
            {"email": "interviewer2@brainerhub.com", "name": "Dan Techie", "role": UserRole.INTERVIEWER},
        ]
        
        users = {}
        for ud in users_data:
            res = await db.execute(text(f"SELECT id FROM users WHERE email = '{ud['email']}'"))
            user_id = res.scalar()
            if not user_id:
                u = User(
                    organization_id=org_id,
                    email=ud["email"],
                    full_name=ud["name"],
                    hashed_password=hash_password("password123"),
                    role=ud["role"],
                    is_active=True,
                    is_verified=True,
                )
                db.add(u)
                await db.flush()
                user_id = u.id
                print(f"  ✓ Created User: {ud['name']} ({ud['role']})")
            else:
                print(f"  - Using existing User: {ud['name']}")
            users[ud["email"]] = user_id

        # 3. Jobs
        jobs_data = [
            {
                "title": "Business Development Executive (BDE)",
                "type": "full_time", "exp": "1-3 years",
                "desc": "Join our sales team to drive growth and build lasting partnerships.",
                "skills": ["Sales", "Lead Generation", "Communication", "Negotiation"]
            },
            {
                "title": "MEAN Stack Developer",
                "type": "full_time", "exp": "3-5 years",
                "desc": "Build scalable web applications using MongoDB, Express, Angular, and Node.js.",
                "skills": ["MongoDB", "Express.js", "Angular", "Node.js", "TypeScript"]
            },
            {
                "title": "Team Lead Python, AI and ML",
                "type": "full_time", "exp": "5-8 years",
                "desc": "Lead our AI/ML initiatives and manage a team of talented python developers.",
                "skills": ["Python", "PyTorch", "TensorFlow", "NLP", "Machine Learning", "Leadership"]
            }
        ]
        
        jobs = []
        for jd in jobs_data:
            j = Job(
                organization_id=org_id,
                created_by_id=users["recruiter@brainerhub.com"],
                title=jd["title"],
                job_type=jd["type"],
                experience_level=jd["exp"],
                description=jd["desc"],
                skills_required=jd["skills"],
                status=JobStatus.ACTIVE
            )
            db.add(j)
            jobs.append(j)
        await db.flush()
        print(f"  ✓ Created {len(jobs)} Jobs")

        # 4. Candidates (Enhanced for Prep Kit)
        candidates_data = [
            {
                "name": "Dimpal Hadiyal", "email": "dimpal@example.com", "job_idx": 0,
                "title": "BDE", "company": "GrowthX", "exp": 2,
                "skills": ["Sales", "Communication", "CRM"],
                "summary": "Experienced BDE with a focus on SaaS sales.",
                "resume": "/static/uploads/resumes/Dimpal Hadiyal.pdf"
            },
            {
                "name": "Nidhin Ezhava", "email": "nidhin@example.com", "job_idx": 0,
                "title": "Sales Associate", "company": "MarketPros", "exp": 1,
                "skills": ["Lead Generation", "Negotiation"],
                "summary": "Junior sales professional looking to grow.",
                "resume": "/static/uploads/resumes/Nidhin Ezhava.pdf"
            },
            {
                "name": "Rishabh Sikligar", "email": "rishabh@example.com", "job_idx": 0,
                "title": "Business Developer", "company": "TechSales", "exp": 3,
                "skills": ["Sales Strategy", "Leadership"],
                "summary": "Strategic thinker in business development.",
                "resume": "/static/uploads/resumes/Rishabh Sikligar.pdf"
            },
            {
                "name": "Akash Patil", "email": "akash@example.com", "job_idx": 1,
                "title": "Full Stack Developer", "company": "WebFlow", "exp": 4,
                "skills": ["React", "Node.js", "MongoDB", "Express.js", "TypeScript"],
                "summary": "Specialist in the MEAN stack with 4 years of experience.",
                "resume": "/static/uploads/resumes/Akash_Patil_MERN_MEAN.docx"
            },
            {
                "name": "Mehul", "email": "mehul@example.com", "job_idx": 1,
                "title": "Frontend Engineer", "company": "DevStudio", "exp": 3,
                "skills": ["Angular", "JavaScript", "CSS"],
                "summary": "UI/UX focused developer.",
                "resume": "/static/uploads/resumes/Mehul_Resume_Latest.docx"
            },
            {
                "name": "Aditya Rola", "email": "aditya@example.com", "job_idx": 2,
                "title": "Senior Python Developer", "company": "AI Labs", "exp": 6,
                "skills": ["Python", "FastAPI", "SQL", "Docker", "AWS", "PostgreSQL"],
                "summary": "Expert in backend architecture and cloud deployments.",
                "resume": "/static/uploads/resumes/Aditya Rola.pdf"
            },
            {
                "name": "Chintan Patel", "email": "chintan@example.com", "job_idx": 2,
                "title": "ML Engineer", "company": "DataMind", "exp": 5,
                "skills": ["Python", "PyTorch", "PostgreSQL", "Next.js"],
                "summary": "Data scientist turned machine learning engineer.",
                "resume": "/static/uploads/resumes/Chintan Patel (1).pdf"
            },
            {
                "name": "Darshan Ramoliya", "email": "darshan@example.com", "job_idx": 2,
                "title": "Backend Lead", "company": "NextGen", "exp": 7,
                "skills": ["Python", "Redis", "Kubernetes"],
                "summary": "Technical lead with deep cloud native knowledge.",
                "resume": "/static/uploads/resumes/Darshan Ramoliya (2).pdf"
            },
            {
                "name": "Karan Patel", "email": "karan@example.com", "job_idx": 2,
                "title": "Python Specialist", "company": "CodeFactory", "exp": 4,
                "skills": ["Python", "Django", "GraphQL"],
                "summary": "Fast learner passionate about clean code.",
                "resume": "/static/uploads/resumes/Karan Patel.pdf"
            },
            {
                "name": "Viral Sherathiya", "email": "viral@example.com", "job_idx": 2,
                "title": "AI Researcher", "company": "FutureAI", "exp": 8,
                "skills": ["Python", "NLP", "TensorFlow"],
                "summary": "Researcher focused on natural language processing.",
                "resume": "/static/uploads/resumes/Viral Sherathiya.pdf"
            },
        ]
        
        for cd in candidates_data:
            c = Candidate(
                organization_id=org_id,
                email=cd["email"],
                full_name=cd["name"],
                match_score=85.0 if cd["job_idx"] == 2 else 70.0,
                current_title=cd.get("title"),
                current_company=cd.get("company"),
                years_experience=cd.get("exp"),
                skills=cd.get("skills", []),
                summary=cd.get("summary"),
                resume_url=cd.get("resume"),
                resume_filename=cd.get("resume").split("/")[-1] if cd.get("resume") else None
            )
            db.add(c)
            await db.flush()
            
            # 5. Application
            app = Application(
                organization_id=org_id,
                job_id=jobs[cd["job_idx"]].id,
                candidate_id=c.id,
                stage=ApplicationStage.INTERVIEW if cd["name"] in ["Aditya Rola", "Akash Patil", "Dimpal Hadiyal"] else ApplicationStage.APPLIED,
                match_score=c.match_score
            )
            db.add(app)
            await db.flush()
            
            # 6. Interviews
            if cd["name"] == "Aditya Rola":
                intv = Interview(
                    organization_id=org_id, candidate_id=c.id, application_id=app.id,
                    scheduled_by_id=users["recruiter@brainerhub.com"],
                    title="Technical Round 1", interview_type=InterviewType.VIDEO,
                    status=InterviewStatus.SCHEDULED, scheduled_at=future(hours=2),
                    duration_minutes=60, meeting_link="https://meet.google.com/abc-defg-hij"
                )
                db.add(intv)
                await db.flush()
                db.add(InterviewPanelist(interview_id=intv.id, user_id=users["interviewer@brainerhub.com"], role="Primary Interviewer"))
                
            if cd["name"] == "Akash Patil":
                intv = Interview(
                    organization_id=org_id, candidate_id=c.id, application_id=app.id,
                    scheduled_by_id=users["recruiter@brainerhub.com"],
                    title="Code Review Session", interview_type=InterviewType.VIDEO,
                    status=InterviewStatus.SCHEDULED, scheduled_at=future(hours=5),
                    duration_minutes=45, meeting_link="https://meet.google.com/xyz-pqrs-tuv"
                )
                db.add(intv)
                await db.flush()
                db.add(InterviewPanelist(interview_id=intv.id, user_id=users["interviewer@brainerhub.com"], role="Interviewer"))

            if cd["name"] == "Dimpal Hadiyal":
                intv = Interview(
                    organization_id=org_id, candidate_id=c.id, application_id=app.id,
                    scheduled_by_id=users["recruiter@brainerhub.com"],
                    title="Culture Fit Interview", interview_type=InterviewType.VIDEO,
                    status=InterviewStatus.SCHEDULED, scheduled_at=future(days=1, hours=2),
                    duration_minutes=30
                )
                db.add(intv)
                await db.flush()
                db.add(InterviewPanelist(interview_id=intv.id, user_id=users["interviewer@brainerhub.com"], role="HR & Culture"))
            
            if cd["name"] == "Chintan Patel":
                intv = Interview(
                    organization_id=org_id, candidate_id=c.id, application_id=app.id,
                    scheduled_by_id=users["recruiter@brainerhub.com"],
                    title="Python Deep Dive", interview_type=InterviewType.VIDEO,
                    status=InterviewStatus.COMPLETED, scheduled_at=ago(days=1, hours=4),
                    duration_minutes=90, notes="Strong GILe and async proficiency."
                )
                db.add(intv)
                await db.flush()
                db.add(InterviewPanelist(interview_id=intv.id, user_id=users["interviewer@brainerhub.com"], role="Lead Interviewer"))
                
                sc = Scorecard(
                    organization_id=org_id, application_id=app.id, interview_id=intv.id,
                    submitted_by_id=users["interviewer@brainerhub.com"],
                    overall_rating=5, recommendation="strong_yes",
                    summary="Excellent technical skills. Very clear communicator."
                )
                db.add(sc)

        await db.commit()
        print(f"  ✓ Seeding Complete!")
        print("\n🔐 Login as Interviewer: interviewer@brainerhub.com / password123\n")

if __name__ == "__main__":
    asyncio.run(seed())
