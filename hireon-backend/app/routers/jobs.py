import uuid
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from app.dependencies import DB, CurrentUser, RecruiterUser
from app.models.job import Job
from app.models.application import Application
from app.schemas.job import JobCreate, JobUpdate, JobOut
from app.utils.pagination import paginate
from app.services.resume_parser import parse_jd
from app.services.storage_service import save_jd, read_file_bytes
from app.services.activity_service import log_activity

router = APIRouter(prefix="/v1/jobs", tags=["jobs"])


@router.get("")
async def list_jobs(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    search: str | None = None,
):
    query = select(Job).where(Job.organization_id == current_user.organization_id)
    if status:
        query = query.where(Job.status == status)
    if search:
        query = query.where(Job.title.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    jobs = (await db.execute(query.offset((page - 1) * limit).limit(limit))).scalars().all()

    # Attach application counts
    job_ids = [j.id for j in jobs]
    count_result = await db.execute(
        select(Application.job_id, func.count(Application.id))
        .where(Application.job_id.in_(job_ids))
        .group_by(Application.job_id)
    )
    counts = {str(row[0]): row[1] for row in count_result.all()}

    items = []
    for j in jobs:
        job_dict = JobOut.model_validate(j).model_dump()
        job_dict["application_count"] = counts.get(str(j.id), 0)
        items.append(job_dict)

    return paginate(items, total, page, limit)


@router.post("", response_model=JobOut, status_code=201)
async def create_job(data: JobCreate, current_user: RecruiterUser, db: DB):
    job = Job(
        organization_id=current_user.organization_id,
        created_by_id=current_user.id,
        **data.model_dump(),
    )
    db.add(job)
    await db.flush()
    
    await log_activity(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE",
        resource_type="job",
        resource_id=str(job.id),
        details={"title": job.title}
    )
    
    await db.commit()
    await db.refresh(job)
    
    return JobOut.model_validate(job)


@router.post("/parse-jd")
async def parse_jd_endpoint(
    current_user: RecruiterUser,
    file: UploadFile = File(...),
):
    """Parses a JD document and returns structured details via AI."""
    # 1. Save the JD file so we have a URL for viewing
    jd_url, jd_filename = await save_jd(file, str(current_user.organization_id))
    
    # 2. Extract contents for AI parsing
    file_bytes = await read_file_bytes(jd_url)
    content_type = file.content_type or ""
    
    try:
        # Keep original parsing logic intact
        parsed_data = await parse_jd(file_bytes, content_type)
        
        # Add the URL and filename to the response
        parsed_data["jd_url"] = jd_url
        parsed_data["jd_filename"] = jd_filename
        return parsed_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse JD: {str(e)}")


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: uuid.UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.organization_id == current_user.organization_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobOut.model_validate(job)


@router.put("/{job_id}", response_model=JobOut)
async def update_job(job_id: uuid.UUID, data: JobUpdate, current_user: RecruiterUser, db: DB):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.organization_id == current_user.organization_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for field, value in data.model_dump(exclude_unset=True, exclude_none=True).items():
        if hasattr(value, "value"):
            value = value.value
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return JobOut.model_validate(job)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: uuid.UUID, current_user: RecruiterUser, db: DB):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.organization_id == current_user.organization_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
