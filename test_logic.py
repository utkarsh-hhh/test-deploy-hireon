import re

def normalize_skill(skill: str) -> str:
    """Normalize skill name for better fuzzy matching."""
    s = skill.lower().strip()
    # Remove text in parentheses (e.g., "(ES6+)")
    s = re.sub(r'\(.*?\)', '', s).strip()
    # Remove common technical suffixes and separators
    s = s.replace(".js", "").replace(" js", "").replace("-", "").replace(".", "")
    s = s.replace("language", "").replace("tech", "")
    # Additional cleanup for 'js' suffix at the end
    if s.endswith("js") and len(s) > 2:
        s = s[:-2]
    # Remove trailing version numbers if simple (e.g., Python3 -> Python)
    s = re.sub(r'(js|ts|css|html)(\d+)$', r'\1', s)
    s = re.sub(r'(\D+)(\d+\.?\d*)$', r'\1', s) 
    return s.strip()


def title_match_bonus(candidate_title, job_title) -> float:
    """Bonus for title similarity (0-10)."""
    if not candidate_title or not job_title:
        return 0.0
    c_lower = candidate_title.lower()
    j_lower = job_title.lower()
    
    # Direct match or containment
    if c_lower == j_lower:
        return 10.0
    if c_lower in j_lower or j_lower in c_lower:
        return 8.0
        
    # Keyword overlap (Developer, Engineer, etc.)
    significant_keywords = {"developer", "engineer", "designer", "manager", "lead", "architect", "analyst"}
    c_words = set(re.findall(r'\w+', c_lower))
    j_words = set(re.findall(r'\w+', j_lower))
    overlap = c_words & j_words
    
    if overlap:
        bonus = len(overlap) * 4.0
        # Boost if they share a significant professional keyword
        if overlap & significant_keywords:
            bonus += 2.0
        return min(7.0, bonus)
        
    return 0.0

def test():
    print("Testing normalize_skill (Refined):")
    tests = [
        ("JavaScript (ES6+)", "javascript"),
        ("Node.js", "node"),
        ("Angular2", "angular"),
        ("Python 3.8", "python"),
        ("React-JS", "react"),
        ("HTML5", "html")
    ]
    for inp, expected in tests:
        res = normalize_skill(inp)
        print(f"  '{inp}' -> '{res}' {'✅' if res == expected else '❌'}")

    print("\nTesting title_match_bonus (Refined):")
    title_tests = [
        ("Software Engineer", "Software Engineer", 10.0),
        ("Senior Developer", "Software Developer", 7.0),
        ("MEAN Stack Dev", "MEAN Stack Developer", 8.0),
        ("Frontend Engineer", "Backend Developer", 0.0)
    ]
    for c, j, expected in title_tests:
        res = title_match_bonus(c, j)
        print(f"  C: '{c}', J: '{j}' -> {res} {'✅' if res >= expected else '❌'}")

if __name__ == "__main__":
    test()
