"""
AI match scoring: compare candidate skills/experience against job requirements.
Uses a unified LLM prompt approach (Groq Llama-3) to perform exact logical scoring
and reasoning in one execution, enforcing strict matching rules.
"""
import json
import logging
from typing import Optional

from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)

groq_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

SYSTEM_PROMPT = """
You are an expert technical recruiter AI with 10+ years of hiring experience.
Your only job is to evaluate how well a candidate's resume matches a job description
and return a structured match score. Be consistent — the same inputs must always
produce the same score. Never assume skills not explicitly mentioned in the resume.
"""

USER_PROMPT_TEMPLATE = """
You will be given a candidate's resume data and a job description.
Analyze them and return ONLY a valid JSON object — no explanation, no markdown.

════════════════════════════════════════
SCORING WEIGHTS (must always sum to 100%)
════════════════════════════════════════
- Skills Match        → 50%
- Title Match         → 20%
- Experience Match    → 20%
- Education Match     → 10%

════════════════════════════════════════
SCORING RULES — READ CAREFULLY
════════════════════════════════════════

1. SKILLS SCORE (0–100):
   - Exact skill match → full credit
   - Synonym match (e.g. JS = JavaScript, Postgres = PostgreSQL) → full credit
   - Related/partial skill → half credit
   - Missing required skill → no credit
   - Formula: (credits earned ÷ total required skills) × 100

2. TITLE SCORE (0–100):
   - Exact title match → 100
   - Same domain, different seniority (e.g. Junior vs Senior Dev) → 75
   - Related role (e.g. Backend Dev applying for Fullstack) → 50
   - Unrelated title → 10
   - No title data → 50 (neutral)

3. EXPERIENCE SCORE (0–100):
   - Meets or slightly exceeds requirement (up to 2× required years) → 100
   - Each year BELOW requirement → subtract 15 points
   - Over-qualified (more than 2× required years) → 85
   - No experience data → 50 (neutral)

4. EDUCATION SCORE (0–100):
   - Exceeds requirement → 100
   - Meets requirement exactly → 100
   - One level below (e.g. Bachelor's when Master's required) → 60
   - Two levels below → 20
   - No education data → 50 (neutral)

   Education levels for reference:
   High School < Diploma < Bachelor's < Master's < PhD

════════════════════════════════════════
FINAL SCORE FORMULA
════════════════════════════════════════
final_score = (skills_score × 0.50)
            + (title_score  × 0.20)
            + (experience_score × 0.20)
            + (education_score  × 0.10)

Round final_score to 1 decimal place.

════════════════════════════════════════
INPUT DATA
════════════════════════════════════════

JOB DESCRIPTION:
- Job Title:             {job_title}
- Min Experience:        {required_years} years
- Required Skills:       {required_skills}
- Education Required:    {required_education}

CANDIDATE RESUME:
- Name:                  {candidate_name}
- Current Title:         {candidate_title}
- Years of Experience:   {candidate_years}
- Skills:                {candidate_skills}
- Education:             {candidate_education}

════════════════════════════════════════
OUTPUT FORMAT — RETURN ONLY THIS JSON
════════════════════════════════════════
{{
  "final_score": 78.5,
  "skills_score": 80,
  "title_score": 75,
  "experience_score": 85,
  "education_score": 60,
  "matched_skills": ["Python", "FastAPI", "PostgreSQL"],
  "missing_skills": ["Kubernetes", "Redis"],
  "shortlisted": true,
  "reasoning": "A structured, multi-line professional evaluation."
}}

RULES FOR OUTPUT:
- "shortlisted" = true if final_score >= {match_threshold}, otherwise false
- "reasoning": Provide a comprehensive, high-quality ATS-style evaluation (80–120 words). 
  Use the following structure with clear headings:
  
  OVERALL ALIGNMENT: (1-2 sentences on how well they fit the role)
  STRENGTHS: (Bullet points of key matching skills/experience)
  GAPS: (Specific missing skills or experience gaps causing deductions)
  VERDICT: (Final professional recommendation)

  Maintain an objective, expert recruiter tone. Be specific about why points were deducted.
- Never output anything outside the JSON object
- Never add markdown, backticks, or commentary
"""


async def evaluate_candidate_match(
    candidate_data: dict,
    candidate_skills: list[str],
    years_experience: Optional[float],
    job,
    match_threshold: float = 70.0
) -> tuple[float, dict]:
    """
    Evaluates candidate purely using the strictly formatted LLM prompt logic.
    Returns: (final_score: float, score_breakdown: dict)
    """
    if not groq_client:
        logger.warning("Groq API key not configured, returning neutral breakdown.")
        return 50.0, {
            "final_score": 50.0,
            "skills_score": 50,
            "title_score": 50,
            "experience_score": 50,
            "education_score": 50,
            "matched_skills": candidate_skills[:5],
            "missing_skills": [],
            "shortlisted": False,
            "reasoning": "AI scoring is disabled. Please review manually."
        }

    # Extract clean string values for prompt injection
    try:
        req_skills_str = ", ".join(job.skills_required or []) if getattr(job, "skills_required", None) else "Not explicitly specified"
    except Exception:
        req_skills_str = "Not explicitly specified"
        
    cand_edu_list = candidate_data.get("education", [])
    cand_edu_str = "Not specified"
    if cand_edu_list:
        cand_edu_str = ", ".join([f"{e.get('degree','')} at {e.get('institution','')}" for e in cand_edu_list if isinstance(e, dict)])

    prompt = USER_PROMPT_TEMPLATE.format(
        job_title=getattr(job, "title", "Role"),
        required_years=getattr(job, "min_experience_years", 0) or 0,
        required_skills=req_skills_str,
        required_education="Not specified",  # Mapped neutral due to lack of DB field
        
        candidate_name=candidate_data.get("full_name", "Candidate"),
        candidate_title=candidate_data.get("current_title", "None"),
        candidate_years=years_experience if years_experience is not None else "Not specified",
        candidate_skills=", ".join(candidate_skills) if candidate_skills else "None",
        candidate_education=cand_edu_str,
        match_threshold=match_threshold
    )

    try:
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT.strip()},
                {"role": "user", "content": prompt.strip()},
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.1,  # Keep low for strict consistency
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from AI")
            
        result = json.loads(content)
        
        # Guarantee fallbacks for UI safety
        final_score = float(result.get("final_score", 50.0))
        result["matched_skills"] = result.get("matched_skills", [])
        result["missing_skills"] = result.get("missing_skills", [])
        result["reasoning"] = result.get("reasoning", "Score could not be properly summarized.")
        result["shortlisted"] = bool(result.get("shortlisted", final_score >= match_threshold))
        
        return final_score, result

    except Exception as e:
        logger.error(f"Error evaluating candidate match via LLM: {e}")
        return 50.0, {
            "final_score": 50.0,
            "skills_score": 50,
            "title_score": 50,
            "experience_score": 50,
            "education_score": 50,
            "matched_skills": [],
            "missing_skills": [],
            "shortlisted": False,
            "reasoning": f"Scoring engine error: {str(e)}"
        }
