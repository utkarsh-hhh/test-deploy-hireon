"""
Resume parsing service using Groq API.
Extracts structured data from PDF/DOCX resumes.
"""
import io
import json
import logging
import re
from datetime import datetime
from typing import Optional

import pdfplumber
import docx
from groq import Groq
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

groq_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None


# ─── Pydantic schema ────────────────────────────────────────────────────────────

class ExperienceEntry(BaseModel):
    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""


class ParsedResume(BaseModel):
    full_name: str = "Unknown"
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_experience: Optional[float] = None  # overridden by calculate_years_from_experience
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    education: list[dict] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    projects: list[dict] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)


# ─── Prompt ─────────────────────────────────────────────────────────────────────

PARSE_PROMPT = """
You are an expert resume parser and technical recruiter AI. Extract structured information from the resume text below.

For the 'summary', do NOT copy the candidate's objective. Analyze their entire resume (skills, experience, and projects) and write a comprehensive, original 3-4 sentence summary of their profile, technical strengths, and potential fit.

For 'experience', extract EVERY job entry with its exact duration string as written (e.g. "Jan 2020 - Dec 2022", "2019 - Present", "3 years 2 months").

Return ONLY a valid JSON object with this exact structure:
{
  "full_name": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "current_title": "string or null",
  "current_company": "string or null",
  "years_experience": null,
  "summary": "AI-generated analysis of the full resume",
  "skills": ["skill1", "skill2", ...],
  "education": [
    {"degree": "string", "institution": "string", "year": number or null}
  ],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "exact duration string from resume e.g. Jan 2020 - Dec 2022",
      "description": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["cert1", ...],
  "languages": ["English", ...]
}

Resume text:
"""

JD_PARSE_PROMPT = """
You are an expert technical recruiter and AI assistant. Extract structured job details from the Job Description text below.

CRITICAL for required_skills: Extract ONLY actual skill keywords, tool names, technologies, domain competencies, and certifications.
DO NOT include sentences, requirements text, or descriptions like "Bachelor's degree in..." or "Strong communication...".
Good examples: ["Python", "Django", "FastAPI", "SQL", "AWS", "Sales", "CRM", "Lead Generation", "B2B Sales", "LinkedIn Outreach", "Excel"]
Bad examples: ["Bachelor's degree in Business", "Strong communication skills", "Knowledge of sales processes"]

Return ONLY a valid JSON object with this exact structure (use null if not found):
{
  "title": "string (the job title)",
  "location": "string or null",
  "min_experience_years": number or null,
  "key_responsibilities": ["resp1", "resp2", ...],
  "required_skills": ["skill_keyword1", "skill_keyword2", ...],
  "description": "A clean, concise markdown version of the main job description, responsibilities, and qualifications."
}
"""


# ─── Text extraction ─────────────────────────────────────────────────────────────

def extract_text_from_pdf(content: bytes) -> str:
    """Extract text using pdfplumber — preserves layout, handles tables and multi-column."""
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if page_text:
                    text += page_text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"pdfplumber extraction failed: {e}")
        return ""


def extract_text_from_docx(content: bytes) -> str:
    """Extract plain text from DOCX bytes."""
    try:
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""


def _detect_file_type(file_content: bytes, content_type: str, filename: str = "") -> str:
    """Returns 'pdf', 'docx', or 'unknown'."""
    ct = content_type.lower()
    fn = filename.lower()
    if "pdf" in ct or fn.endswith(".pdf"):
        return "pdf"
    if "docx" in ct or "document" in ct or "zip" in ct or fn.endswith(".docx") or fn.endswith(".doc"):
        return "docx"
    if file_content[:4] == b"%PDF":
        return "pdf"
    if file_content[:2] == b"PK":
        return "docx"
    return "unknown"


# ─── Years experience calculation ────────────────────────────────────────────────

def calculate_years_from_experience(experience_list: list) -> Optional[float]:
    """
    Calculate total years of experience from experience entries.
    Never trust the LLM's years_experience — compute it from dates.
    """
    total_months = 0
    current_year = datetime.now().year

    for exp in experience_list:
        if hasattr(exp, 'model_dump'):
            exp = exp.model_dump()
        duration = str(exp.get('duration', '') or '').strip()
        if not duration:
            continue

        # Pattern: "X years Y months" explicitly stated
        years_match = re.search(r'(\d+)\s*(?:yr|year|years?)', duration, re.IGNORECASE)
        months_match = re.search(r'(\d+)\s*(?:mo|month|months?)', duration, re.IGNORECASE)
        if years_match or months_match:
            if years_match:
                total_months += int(years_match.group(1)) * 12
            if months_match:
                total_months += int(months_match.group(1))
            continue

        # Pattern: date range — normalize "Present/Current/Now" to current year
        norm = re.sub(
            r'\b(present|current|now|today)\b',
            f'Dec {current_year}',
            duration,
            flags=re.IGNORECASE,
        )
        years_found = re.findall(r'\b((?:19|20)\d{2})\b', norm)
        if len(years_found) >= 2:
            try:
                y1, y2 = int(years_found[0]), int(years_found[-1])
                if y2 >= y1:
                    total_months += (y2 - y1) * 12
            except Exception:
                pass
        elif len(years_found) == 1:
            total_months += 12  # single year → assume ~1 year tenure

    if total_months == 0:
        return None
    return round(total_months / 12, 1)


# ─── Fallback ────────────────────────────────────────────────────────────────────

def _regex_fallback(text: str) -> dict:
    parsed = {
        "raw_text": text[:500],
        "full_name": "Applicant (Auto-Parsed)",
        "email": None,
        "phone": None,
        "location": "Unknown Location",
        "current_title": "Software Professional",
        "current_company": "Unknown",
        "years_experience": None,
        "summary": "This candidate was parsed using local regex heuristics.",
        "skills": [],
    }

    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        parsed["email"] = email_match.group(0)

    phone_match = re.search(r'(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}', text)
    if phone_match:
        parsed["phone"] = phone_match.group(0)

    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines and len(lines[0]) < 50:
        parsed["full_name"] = lines[0].title()

    return parsed


# ─── Groq call with Pydantic validation + retry ──────────────────────────────────

def _call_groq_with_retry(text: str) -> Optional[dict]:
    """
    Call Groq llama-3.3-70b-versatile, validate with Pydantic, retry once on failure.
    Returns validated dict with years_experience calculated from dates.
    """
    last_error = None
    for attempt in range(2):
        try:
            messages = [
                {"role": "system", "content": "You are a helpful assistant that outputs ONLY valid JSON."},
                {"role": "user", "content": PARSE_PROMPT + text[:8000]},
            ]
            if attempt == 1 and last_error:
                messages[1]["content"] += f"\n\nIMPORTANT: Previous attempt failed validation: {last_error}. Fix the JSON structure."

            completion = groq_client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            content = completion.choices[0].message.content
            if not content:
                last_error = "Empty response"
                continue

            raw = json.loads(content)
            validated = ParsedResume(**raw)
            result = validated.model_dump()

            # Override years_experience — always calculate from dates, never trust LLM
            result["years_experience"] = calculate_years_from_experience(validated.experience)

            # Serialize experience to plain dicts
            result["experience"] = [
                e.model_dump() if hasattr(e, 'model_dump') else e
                for e in validated.experience
            ]
            return result

        except Exception as e:
            last_error = str(e)
            if attempt == 0:
                logger.warning(f"Groq parse attempt 1 failed ({e}), retrying...")
            else:
                logger.error(f"Groq parse attempt 2 failed ({e})")

    return None


# ─── Public API ──────────────────────────────────────────────────────────────────

async def parse_resume(file_content: bytes, content_type: str, filename: str = "") -> dict:
    """Main entry point: parse resume bytes and return structured dict."""
    file_type = _detect_file_type(file_content, content_type, filename)
    if file_type == "pdf":
        text = extract_text_from_pdf(file_content)
    elif file_type == "docx":
        text = extract_text_from_docx(file_content)
    else:
        logger.warning(f"Unsupported content type: {content_type}")
        return {}

    if not text:
        logger.warning("Could not extract text from resume")
        return {}

    if not groq_client:
        logger.warning("No Groq API key configured — using regex fallback")
        return _regex_fallback(text)

    try:
        result = _call_groq_with_retry(text)
        if result:
            return result
        return _regex_fallback(text)
    except Exception as e:
        error_msg = str(e).lower()
        if "rate balance" in error_msg or "429" in error_msg:
            logger.error(f"Groq API Quota Exceeded: {e}")
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail="Groq AI service is currently rate limited. Please try again soon."
            )
        logger.error(f"Groq parsing failed: {e}")
        return _regex_fallback(text)


async def parse_jd(file_bytes: bytes, content_type: str) -> dict:
    """Extracts job details using Groq."""
    if "pdf" in content_type:
        text = extract_text_from_pdf(file_bytes)
    elif "docx" in content_type or "document" in content_type:
        text = extract_text_from_docx(file_bytes)
    elif "text/plain" in content_type or "text" in content_type:
        text = file_bytes.decode('utf-8', errors='ignore')
    else:
        text = file_bytes.decode('utf-8', errors='ignore')

    if not text.strip():
        raise ValueError("No text could be extracted from the file.")

    if not groq_client:
        logger.warning("Groq API key not configured. Returning empty JD data.")
        return {
            "title": "Software Engineer",
            "location": None,
            "min_experience_years": None,
            "key_responsibilities": [],
            "required_skills": [],
            "description": text[:800],
        }

    try:
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs ONLY valid JSON. " + JD_PARSE_PROMPT},
                {"role": "user", "content": text[:15000]},
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from AI")
        return json.loads(content.strip())
    except Exception as e:
        logger.error(f"Error parsing JD with Groq: {e}")
        return {
            "title": "Unknown Title",
            "required_skills": [],
            "description": text[:500],
        }

async def generate_match_summary(
    candidate_data: dict, 
    job_title: str, 
    job_skills: list[str], 
    score: float, 
    match_threshold: float,
    decision_reasons: list[str]
) -> str:
    """
    Generates a 2-3 sentence paragraph explaining why a candidate received their match score,
    focusing on their fit against the specific job requirements.
    """
    if not groq_client:
        return "AI analysis unavailable. Please refer to the specific bullet points above."

    shortlisted = score >= match_threshold
    status_text = "Shortlisted" if shortlisted else "Rejected / Needs Review"

    prompt = f"""
    You are an expert technical recruiter AI. Write a concise, professional 2-3 sentence summary explaining exactly why this candidate was {status_text} for the {job_title} role.
    
    Context:
    - Candidate Score: {score}% (Threshold: {match_threshold}%)
    - Candidate Skills: {', '.join(candidate_data.get('skills', [])[:15])}
    - Candidate Experience: {candidate_data.get('years_experience')} years
    - Required Job Skills: {', '.join(job_skills[:15])}
    
    Decision Breakdown:
    {chr(10).join(decision_reasons)}
    
    Guidelines:
    - Do NOT use bullet points. Write a single short paragraph.
    - Be direct but professional. Speak about the candidate in the third person.
    - Specifically mention what they matched well on OR what key skills/experience they are missing that caused the low score.
    - Keep it strictly under 50 words.
    """

    try:
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert technical recruiter. Output only the requested summary paragraph."},
                {"role": "user", "content": prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=150,
        )
        content = response.choices[0].message.content
        if not content:
            return "Could not generate match summary."
        return content.strip()
    except Exception as e:
        logger.error(f"Error generating match summary with Groq: {e}")
        return "Could not generate match summary."
