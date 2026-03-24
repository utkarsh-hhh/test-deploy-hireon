from fastapi import APIRouter, HTTPException, Body
from app.dependencies import DB, InterviewerUser
from app.services import ai_evaluator

router = APIRouter(prefix="/v1/ai", tags=["ai"])

@router.post("/evaluate-notes")
async def evaluate_notes(
    current_user: InterviewerUser,
    raw_notes: str = Body(..., embed=True)
):
    """
    Generate a structured evaluation from raw interview notes.
    """
    if not raw_notes or len(raw_notes.strip()) < 10:
        raise HTTPException(status_code=400, detail="Notes are too short to evaluate.")

    result = await ai_evaluator.evaluate_interview_notes(raw_notes)
    
    if not result:
        raise HTTPException(status_code=500, detail="AI evaluation failed. Please try again or check your Gemini API key.")

    return result
