"""
Live scoring test: runs JDs + Resumes through the actual parse + score pipeline.
Usage: python test_scoring_live.py
"""
import asyncio
import json
import os
import sys

# Make sure app is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.services.resume_parser import parse_resume, parse_jd, extract_text_from_pdf, extract_text_from_docx
from app.services.match_scorer import compute_match_score, compute_score_breakdown, normalize_skill, _expand_compound_skills
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class _JobReq:
    title: str
    description: str = ""
    requirements: str = ""
    skills_required: list = field(default_factory=list)
    min_experience_years: float = 0
    experience_level: str = ""


JD_DIR = os.path.join(os.path.dirname(__file__), "..", "JD", "JD")

JOBS = {
    "BDE": {
        "jd_file": os.path.join(JD_DIR, "Business Development Executive (BDE).pdf"),
        "resume_dir": os.path.join(JD_DIR, "Resume BDE"),
    },
    "MEAN": {
        "jd_file": os.path.join(JD_DIR, "MEAN Stack Developer.pdf"),
        "resume_dir": os.path.join(JD_DIR, "Resume MEAN"),
    },
    "Python": {
        "jd_file": os.path.join(JD_DIR, "Team Lead Python, AI and ML.pdf"),
        "resume_dir": os.path.join(JD_DIR, "Resume Python"),
    },
}

MATCH_THRESHOLD = 70.0


CACHE_FILE = os.path.join(os.path.dirname(__file__), "test_parse_cache.json")


def load_cache() -> dict:
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def read_file(path: str) -> tuple[bytes, str]:
    with open(path, "rb") as f:
        content = f.read()
    ext = path.lower().split(".")[-1]
    ct = "application/pdf" if ext == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return content, ct


async def run():
    print("\n" + "="*70)
    print("  SCORING TEST — JDs vs Resumes")
    print("="*70)

    cache = load_cache()
    cache_updated = False

    for job_name, cfg in JOBS.items():
        print(f"\n{'-'*70}")
        print(f"  JOB: {job_name}")
        print(f"{'-'*70}")

        # Parse JD (cached)
        jd_cache_key = f"jd_{job_name}"
        if jd_cache_key in cache:
            jd = cache[jd_cache_key]
            print("  [JD from cache]")
        else:
            jd_bytes, jd_ct = read_file(cfg["jd_file"])
            jd = await parse_jd(jd_bytes, jd_ct)
            cache[jd_cache_key] = jd
            cache_updated = True

        required_skills = jd.get("required_skills", [])
        min_exp = jd.get("min_experience_years") or 0
        print(f"  Required Skills : {required_skills}")
        print(f"  Min Experience  : {min_exp} yrs")
        print()

        job_req = _JobReq(
            title=jd.get("title", job_name),
            description=jd.get("description", ""),
            skills_required=required_skills,
            min_experience_years=min_exp,
        )

        # Score each resume
        resume_dir = cfg["resume_dir"]
        files = [f for f in os.listdir(resume_dir) if f.endswith((".pdf", ".docx"))]

        results = []
        for fname in files:
            fpath = os.path.join(resume_dir, fname)
            resume_cache_key = f"resume_{fname}"
            if resume_cache_key in cache:
                parsed = cache[resume_cache_key]
                print(f"  [Resume '{fname}' from cache]")
            else:
                rbytes, rct = read_file(fpath)
                parsed = await parse_resume(rbytes, rct, fname)
                cache[resume_cache_key] = parsed
                cache_updated = True
            candidate_skills = parsed.get("skills", [])
            years_exp = parsed.get("years_experience")

            score = await compute_match_score(
                candidate_skills=candidate_skills,
                parsed_data=parsed,
                years_experience=years_exp,
                job=job_req,
            )
            breakdown = compute_score_breakdown(
                candidate_skills=candidate_skills,
                parsed_data=parsed,
                years_experience=years_exp,
                job_skills=required_skills,
                job_title=job_req.title,
                score=score,
                match_threshold=MATCH_THRESHOLD,
            )

            # Normalized skill debug
            cand_norm = {normalize_skill(s) for s in _expand_compound_skills(candidate_skills) if s}
            req_norm  = {normalize_skill(s) for s in _expand_compound_skills(required_skills) if s}
            overlap   = cand_norm & req_norm
            missing   = req_norm - cand_norm

            results.append({
                "name": fname.replace(".pdf","").replace(".docx",""),
                "score": score,
                "years": years_exp,
                "level": breakdown["level"],
                "matched": breakdown["matched_skills"],
                "missing": [s for s in required_skills if normalize_skill(s) in missing],
                "candidate_skills": candidate_skills,
                "shortlisted": breakdown["shortlisted"],
            })

        # Sort by score desc
        results.sort(key=lambda x: x["score"], reverse=True)

        for r in results:
            verdict = "✅ OK CORRECT" if r["shortlisted"] else "❌ BELOW THRESHOLD"
            print(f"  Candidate '{r['name']}': "
                  f"MEAN={int(r['score'])} "
                  f"Years={r['years']} "
                  f"Level={r['level']} "
                  f"-> {verdict}")
            print(f"    Matched  : {r['matched']}")
            print(f"    Missing  : {r['missing']}")
            print(f"    All Skills: {r['candidate_skills'][:8]}")
            print()

    if cache_updated:
        save_cache(cache)
        print("\n  [Parse cache saved — future runs won't call Groq API]")

    print("="*70)
    print("  TEST COMPLETE")
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(run())
