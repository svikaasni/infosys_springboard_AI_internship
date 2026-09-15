import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/predict", tags=["prediction"])

class CommitInput(BaseModel):
    commit_diff: str
    commit_message: Optional[str] = ""
    author: Optional[str] = "Unknown"

class PredictionResult(BaseModel):
    risk_level: str
    risk_score: int
    risk_reasons: List[str]
    vulnerable_areas: List[str]
    recommended_tests: List[str]
    summary: str

HIGH_RISK_PATTERNS = [
    (r"auth|login|password|token|session|jwt|oauth|credential", "Authentication/security code changed"),
    (r"database|sql|query|migration|schema|orm|model", "Database layer modification"),
    (r"null|None|undefined|\.get\(|optional", "Potential null reference introduced"),
    (r"delete|drop|truncate|remove|destroy", "Destructive operation detected"),
    (r"payment|billing|invoice|charge|stripe", "Payment processing code changed"),
    (r"race|concurrent|thread|async|await|lock|mutex", "Concurrent code changed"),
    (r"config|env|secret|key|credential", "Configuration or secrets modified"),
]

MEDIUM_RISK_PATTERNS = [
    (r"api|endpoint|route|router|controller", "API endpoint modified"),
    (r"cache|redis|memcache", "Caching layer changed"),
    (r"retry|timeout|fallback|circuit", "Error handling logic changed"),
    (r"loop|recursion|while|for.*range", "Loop logic modified"),
    (r"import|dependency|require|package", "Dependency changed"),
]

def analyze_diff(diff: str, message: str) -> PredictionResult:
    combined = (diff + " " + message).lower()
    risk_reasons = []
    vulnerable_areas = []
    score = 0

    for pattern, reason in HIGH_RISK_PATTERNS:
        if re.search(pattern, combined):
            risk_reasons.append(reason)
            score += 20

    for pattern, reason in MEDIUM_RISK_PATTERNS:
        if re.search(pattern, combined):
            risk_reasons.append(reason)
            score += 10

    lines_changed = len([l for l in diff.split("\n") if l.startswith("+") or l.startswith("-")])
    if lines_changed > 100:
        score += 15
        risk_reasons.append(f"Large change — {lines_changed} lines modified")
    elif lines_changed > 50:
        score += 8
        risk_reasons.append(f"Moderate change — {lines_changed} lines modified")

    score = min(score, 100)

    if score >= 60:
        risk_level = "High"
    elif score >= 30:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    if re.search(r"auth|login|token", combined):
        vulnerable_areas.append("Authentication flow")
    if re.search(r"database|sql|model|schema", combined):
        vulnerable_areas.append("Data access layer")
    if re.search(r"api|endpoint|route", combined):
        vulnerable_areas.append("API endpoints")
    if re.search(r"payment|billing", combined):
        vulnerable_areas.append("Payment processing")
    if not vulnerable_areas:
        vulnerable_areas.append("General application logic")

    recommended_tests = ["Run full regression test suite"]
    if re.search(r"auth|login|token|session", combined):
        recommended_tests.append("Run authentication unit tests")
        recommended_tests.append("Test login/logout flows manually")
    if re.search(r"database|sql|model", combined):
        recommended_tests.append("Run database integration tests")
        recommended_tests.append("Verify data integrity after migration")
    if re.search(r"api|endpoint|route", combined):
        recommended_tests.append("Run API contract tests")
    if len(recommended_tests) == 1:
        recommended_tests.append("Write unit tests for changed functions")
        recommended_tests.append("Run existing test suite")

    summary = (
        f"This commit has {risk_level.lower()} bug risk (score: {score}/100). "
        f"{len(risk_reasons)} risk factor(s) detected across {len(vulnerable_areas)} area(s). "
        f"{'Recommend thorough review before merging.' if score >= 60 else 'Standard code review recommended.'}"
    )

    return PredictionResult(
        risk_level=risk_level,
        risk_score=score,
        risk_reasons=risk_reasons or ["No high-risk patterns detected"],
        vulnerable_areas=vulnerable_areas,
        recommended_tests=recommended_tests,
        summary=summary
    )


@router.post("", response_model=PredictionResult)
def predict_bug_risk(
    payload: CommitInput,
    current_user: User = Depends(get_current_user)
):
    return analyze_diff(payload.commit_diff, payload.commit_message or "")
