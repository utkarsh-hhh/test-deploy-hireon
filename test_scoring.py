import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'hireon-backend')))

from app.services.match_scorer import compute_match_score, normalize_skill

class MockJob:
    def __init__(self, title, requirements, skills_required, experience_level):
        self.title = title
        self.description = requirements
        self.requirements = requirements
        self.skills_required = skills_required
        self.experience_level = experience_level

async def main():
    # Test case based on user screenshot: MEAN Stack Developer
    job = MockJob(
        title="MEAN Stack Developer",
        requirements="We need a MEAN stack developer with JavaScript, Node.js, Express, and Angular experience.",
        skills_required=["JavaScript", "Node.js", "Express", "Angular", "MongoDB"],
        experience_level="Mid"
    )
    
    candidate_skills = ["JavaScript (ES6+)", "Node.js", "Express", "Angular", "MEAN Stack"]
    parsed_data = {
        "current_title": "Software Engineer",
        "summary": "Full stack developer with experience in modern web technologies including Node and Angular."
    }
    
    print(f"Testing score for Job: {job.title}")
    print(f"Candidate Skills: {candidate_skills}")
    
    # Test normalization
    print("\nNormalization checks:")
    for s in ["JavaScript (ES6+)", "Node.js", "Angular2", "React.js"]:
        print(f"  {s} -> {normalize_skill(s)}")

    # Compute score (Mocking embeddings fallback since we don't have keys in this script environment easily)
    # We can expect the fallback to trigger if keys aren't set, which uses our improved boost logic.
    os.environ["GEMINI_API_KEY"] = ""
    os.environ["MISTRAL_API_KEY"] = ""
    
    score = await compute_match_score(candidate_skills, parsed_data, 3, job)
    print(f"\nFinal Score: {score}")

if __name__ == "__main__":
    asyncio.run(main())
