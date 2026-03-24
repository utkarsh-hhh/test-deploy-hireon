"""
AI accuracy test: parse JDs + resumes, score all combinations, print results.
Run: python test_ai_accuracy.py
"""
import asyncio
import json
import os
import sys

# Make sure we can import app modules
sys.path.insert(0, os.path.dirname(__file__))
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Load .env manually
import os as _os
_env_path = _os.path.join(_os.path.dirname(__file__), ".env")
if _os.path.exists(_env_path):
    for _line in open(_env_path):
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            _os.environ.setdefault(_k.strip(), _v.strip())

from app.services.resume_parser import parse_resume, parse_jd, calculate_years_from_experience
from app.services.match_scorer import compute_match_score, normalize_skill

BASE = r"d:\hire-on - Copy (2)\JD\JD"

JD_FILES = {
    "MEAN Stack Developer": os.path.join(BASE, "MEAN Stack Developer.pdf"),
    "Python AI/ML Team Lead": os.path.join(BASE, "Team Lead Python, AI and ML.pdf"),
    "BDE": os.path.join(BASE, "Business Development Executive (BDE).pdf"),
}

RESUME_FOLDERS = {
    "MEAN": os.path.join(BASE, "Resume MEAN"),
    "Python": os.path.join(BASE, "Resume Python"),
    "BDE": os.path.join(BASE, "Resume BDE"),
}

SEP = "-" * 70


def read_file(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def content_type(path: str) -> str:
    return "application/pdf" if path.endswith(".pdf") else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


async def main():
    print(f"\n{'='*70}")
    print("  HIREON AI ACCURACY TEST")
    print(f"{'='*70}\n")

    # -- Parse JDs --------------------------------------------------------------
    print("STEP 1 — Parsing Job Descriptions")
    print(SEP)
    parsed_jds = {}
    for jd_name, jd_path in JD_FILES.items():
        print(f"  -> {jd_name}...")
        jd_bytes = read_file(jd_path)
        jd_data = await parse_jd(jd_bytes, content_type(jd_path))
        parsed_jds[jd_name] = jd_data
        print(f"     Title: {jd_data.get('title')}")
        print(f"     Min exp: {jd_data.get('min_experience_years')} years")
        skills = jd_data.get('required_skills', [])
        print(f"     Required skills ({len(skills)}): {', '.join(skills[:8])}{'...' if len(skills)>8 else ''}")
        print()

    # -- Parse Resumes ----------------------------------------------------------
    print("\nSTEP 2 — Parsing Resumes")
    print(SEP)
    parsed_resumes = {}  # {folder: [{name, data}]}

    for folder_name, folder_path in RESUME_FOLDERS.items():
        parsed_resumes[folder_name] = []
        files = [f for f in os.listdir(folder_path) if f.endswith(('.pdf', '.docx'))]
        print(f"  [{folder_name} resumes — {len(files)} files]")
        for fname in files:
            fpath = os.path.join(folder_path, fname)
            print(f"  -> {fname}...")
            data = await parse_resume(read_file(fpath), content_type(fpath), fname)
            parsed_resumes[folder_name].append({"file": fname, "data": data})
            name = data.get("full_name", "?")
            skills = data.get("skills", [])
            yoe = data.get("years_experience")
            title = data.get("current_title", "?")
            print(f"     Name: {name} | Title: {title} | YoE: {yoe}")
            print(f"     Skills ({len(skills)}): {', '.join(skills[:8])}{'...' if len(skills)>8 else ''}")
        print()

    # -- Scoring Matrix ---------------------------------------------------------
    print("\nSTEP 3 — Match Scoring Matrix")
    print(SEP)

    # Create mock job objects
    class MockJob:
        def __init__(self, jd: dict):
            self.title = jd.get("title", "")
            self.description = jd.get("description", "")
            self.requirements = ""
            self.skills_required = jd.get("required_skills", [])
            self.experience_level = None
            self.min_experience_years = jd.get("min_experience_years") or 0

    # Define expected match matrix: (resume_folder, jd_name) -> "MATCH" or "MISMATCH"
    expected = {
        ("MEAN", "MEAN Stack Developer"): "MATCH",
        ("MEAN", "Python AI/ML Team Lead"): "MISMATCH",
        ("MEAN", "BDE"): "MISMATCH",
        ("Python", "MEAN Stack Developer"): "MISMATCH",
        ("Python", "Python AI/ML Team Lead"): "MATCH",
        ("Python", "BDE"): "MISMATCH",
        ("BDE", "MEAN Stack Developer"): "MISMATCH",
        ("BDE", "Python AI/ML Team Lead"): "MISMATCH",
        ("BDE", "BDE"): "MATCH",
    }

    correct = 0
    total = 0
    MATCH_THRESHOLD = 50  # score >= this = MATCH

    results_table = []

    for folder_name, resumes in parsed_resumes.items():
        for resume_info in resumes:
            fname = resume_info["file"]
            data = resume_info["data"]
            skills = data.get("skills", [])
            yoe = data.get("years_experience")
            cand_name = data.get("full_name", fname)

            row_scores = {}
            for jd_name, jd_data in parsed_jds.items():
                job = MockJob(jd_data)
                score = await compute_match_score(skills, data, yoe, job)
                row_scores[jd_name] = score

            results_table.append({
                "folder": folder_name,
                "name": cand_name,
                "file": fname,
                "scores": row_scores,
            })

    # Print table
    jd_names = list(parsed_jds.keys())
    short = {"MEAN Stack Developer": "MEAN", "Python AI/ML Team Lead": "Python", "BDE": "BDE"}
    header = f"{'Candidate':<28} {'Folder':<8}" + "".join(f"  {short[j]:>12}" for j in jd_names)
    print(header)
    print("-" * len(header))

    for row in results_table:
        line = f"{row['name'][:27]:<28} {row['folder']:<8}"
        for jd_name in jd_names:
            s = row['scores'][jd_name]
            flag = ""
            exp = expected.get((row['folder'], jd_name))
            predicted = "MATCH" if s >= MATCH_THRESHOLD else "MISMATCH"
            if exp:
                total += 1
                if predicted == exp:
                    correct += 1
                    flag = "OK"
                else:
                    flag = "XX"
            line += f"  {s:>7.1f}{flag:>5}"
        print(line)

    # -- Cross-test summary ------------------------------------------------------
    print(f"\n{'='*70}")
    accuracy = (correct / total * 100) if total else 0
    print(f"  Accuracy: {correct}/{total} correct = {accuracy:.1f}%")
    print(f"  Threshold used: score >= {MATCH_THRESHOLD} -> MATCH")
    print(f"{'='*70}")

    # -- Key cross-contamination checks -----------------------------------------
    print("\nKEY CROSS-CONTAMINATION CHECKS:")
    print(SEP)
    for row in results_table:
        folder = row['folder']
        scores = row['scores']
        name = row['name'][:25]
        mean_s = scores.get("MEAN Stack Developer", 0)
        py_s   = scores.get("Python AI/ML Team Lead", 0)
        bde_s  = scores.get("BDE", 0)

        if folder == "MEAN":
            result = "OK CORRECT" if mean_s >= MATCH_THRESHOLD and py_s < MATCH_THRESHOLD else "XX WRONG"
            print(f"  MEAN candidate '{name}': MEAN={mean_s:.0f} Python={py_s:.0f} BDE={bde_s:.0f} -> {result}")
        elif folder == "Python":
            result = "OK CORRECT" if py_s >= MATCH_THRESHOLD and mean_s < MATCH_THRESHOLD else "XX WRONG"
            print(f"  Python candidate '{name}': MEAN={mean_s:.0f} Python={py_s:.0f} BDE={bde_s:.0f} -> {result}")
        elif folder == "BDE":
            result = "OK CORRECT" if bde_s >= MATCH_THRESHOLD and mean_s < MATCH_THRESHOLD and py_s < MATCH_THRESHOLD else "XX WRONG"
            print(f"  BDE candidate '{name}': MEAN={mean_s:.0f} Python={py_s:.0f} BDE={bde_s:.0f} -> {result}")

    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    asyncio.run(main())
