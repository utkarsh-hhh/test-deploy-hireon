import logging
import json
import google.generativeai as genai
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

# Configure Groq fallback
groq_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

SYSTEM_PROMPT = """
You are an AI assistant embedded in an Interviewer Panel application. 
Your role is to help interviewers write structured, professional, and 
insightful candidate evaluations after an interview session.

Convert raw interviewer notes into a structured JSON response.

Expected JSON Structure:
{
  "professional_description": "2-3 paragraphs summary",
  "skills": [
    { "name": "Problem Solving", "rating": 1-5, "justification": "..." },
    { "name": "Communication", "rating": 1-5, "justification": "..." },
    { "name": "Technical Knowledge", "rating": 1-5, "justification": "..." },
    { "name": "Cultural Fit", "rating": 1-5, "justification": "..." }
  ],
  "overall_impression": { "rating": 1-5, "justification": "..." },
  "hr_summary": {
    "summary": "3-4 lines for HR",
    "recommendation": "Strong Yes / Yes / Maybe / No / Strong No",
    "strength": "standout strength",
    "concern": "area of concern"
  }
}

Keep all descriptions objective, professional, and HR-friendly. 
Return ONLY strictly valid JSON. No markdown backticks.
"""

async def evaluate_interview_notes(raw_notes: str):
    """
    Call Gemini or Groq to structure raw interview notes.
    """
    if not settings.gemini_api_key and not settings.groq_api_key:
        logger.warning("No AI API keys configured (Gemini/Groq)")
        return None

    try:
        # Try Gemini first
        if settings.gemini_api_key:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash-latest')
                prompt = f"{SYSTEM_PROMPT}\n\nInterviewer Raw Notes:\n{raw_notes}"
                response = await model.generate_content_async(prompt)
                text = response.text
                return parse_json_response(text)
            except Exception as ge:
                logger.error(f"Gemini evaluation failed, checking for Groq: {ge}")
                if not settings.groq_api_key:
                    raise ge

        # Try Groq fallback
        if settings.groq_api_key:
            prompt = f"{SYSTEM_PROMPT}\n\nInterviewer Raw Notes:\n{raw_notes}"
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that returns strictly JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)

    except Exception as e:
        logger.error(f"AI Evaluation failure: {e}")
        return None

def parse_json_response(text: str):
    """Clean up and parse JSON from LLM response."""
    try:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        # Try a last resort regex or raw cleanup if needed, but simple strip is usually enough
        return json.loads(text.strip())

PREP_HUB_PROMPT = """
You are an expert technical interviewer helping a candidate prepare for an upcoming interview.
Given the Job Title, Required Skills (or Description), AND the Candidate's Resume Highlights, generate 6 high-quality interview flashcards.
Create 3 technical/system-design questions and 3 behavioral questions that specifically cross-reference the candidate's background with the job requirements.

Return strictly valid JSON:
{
  "flashcards": [
    { "category": "Technical", "question": "...", "hint": "...", "key_points": ["...", "..."] },
    { "category": "Behavioral", "question": "...", "hint": "...", "key_points": ["...", "..."] }
  ],
  "focus_areas": [
    {"topic": "...", "reason": "..."}
  ]
}
"""

async def generate_prep_materials(job_title: str, job_description: str, candidate_resume: str = ""):
    """
    Call Gemini or Groq to generate prep flashcards based on a Job and Candidate Resume.
    """
    if not settings.gemini_api_key and not settings.groq_api_key:
        # Fallback Mock Data
        return {"flashcards": [{"category": "Technical", "question": "Mock Q", "hint": "Mock H", "key_points": []}], "focus_areas": []}

    prompt = f"{PREP_HUB_PROMPT}\n\nJob Title: {job_title}\nJob Info/Skills: {job_description}\nCandidate Resume Highlights: {candidate_resume}"

    try:
        if settings.gemini_api_key:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash-latest')
                response = await model.generate_content_async(prompt)
                return parse_json_response(response.text)
            except Exception as ge:
                logger.error(f"Gemini prep failed, checking Groq: {ge}")
                if not settings.groq_api_key:
                    raise ge

        if settings.groq_api_key:
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that returns strictly JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)

    except Exception as e:
        logger.error(f"AI Prep generation failure: {e}")
        return {"flashcards": [], "focus_areas": []}
