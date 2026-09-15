"""
Health & Risk Scoring Service
-----------------------------

This module provides two different scores:

1. Project Health Score
   A 0-100 score describing the overall health of the bug queue.

2. Bug Risk Score
   A 0-100 score describing how risky an individual bug is based on
   severity, priority, root-cause confidence, recurrence/duplicates,
   exception type, and whether a precise failure location was found.

These are heuristic scores intended to help developers prioritize work.
"""

import json
from dataclasses import dataclass, field
from typing import List, Optional

from sqlalchemy.orm import Session

from app import models


DUPLICATE_SIMILARITY_THRESHOLD = 50.0
RESOLUTION_BASELINE_HOURS = 24.0


# ===================================================================
# PROJECT HEALTH SCORE
# ===================================================================

@dataclass
class HealthScoreBreakdown:
    label: str
    penalty: float
    detail: str


@dataclass
class HealthScoreResult:
    score: int
    status: str
    total_bugs: int
    open_bugs: int
    critical_open_bugs: int
    resolved_bugs: int
    resolved_pct: float
    likely_duplicate_open_bugs: int
    avg_resolution_hours: float
    breakdown: List[HealthScoreBreakdown] = field(default_factory=list)


def _status_for(score: int) -> str:
    if score >= 85:
        return "Excellent"

    if score >= 70:
        return "Good"

    if score >= 50:
        return "Fair"

    if score >= 30:
        return "Poor"

    return "Critical"


def compute_health_score(db: Session) -> HealthScoreResult:
    """
    Compute the overall project health score.

    Higher score = healthier project.
    """

    bugs = db.query(models.Bug).all()
    total = len(bugs)

    if total == 0:
        return HealthScoreResult(
            score=100,
            status="Excellent",
            total_bugs=0,
            open_bugs=0,
            critical_open_bugs=0,
            resolved_bugs=0,
            resolved_pct=0.0,
            likely_duplicate_open_bugs=0,
            avg_resolution_hours=0.0,
            breakdown=[
                HealthScoreBreakdown(
                    "No bugs yet",
                    0.0,
                    "Nothing to penalize — score starts at 100.",
                )
            ],
        )

    open_statuses = (
        models.StatusEnum.open,
        models.StatusEnum.in_progress,
    )

    resolved_statuses = (
        models.StatusEnum.resolved,
        models.StatusEnum.closed,
    )

    open_bugs = [
        bug
        for bug in bugs
        if bug.status in open_statuses
    ]

    resolved_bugs = [
        bug
        for bug in bugs
        if bug.status in resolved_statuses
    ]

    critical_open = [
        bug
        for bug in open_bugs
        if bug.severity == models.SeverityEnum.critical
    ]

    open_ratio = len(open_bugs) / total
    critical_ratio = len(critical_open) / total

    resolved_pct = round(
        len(resolved_bugs) / total * 100,
        1,
    )

    # ---------------------------------------------------------------
    # Duplicate signal
    # ---------------------------------------------------------------

    duplicate_open_count = 0

    for bug in open_bugs:
        if (
            bug.analysis
            and bug.analysis.duplicates_json
        ):
            try:
                matches = json.loads(
                    bug.analysis.duplicates_json
                )
            except (TypeError, ValueError):
                matches = []

            if any(
                match.get("similarity", 0)
                >= DUPLICATE_SIMILARITY_THRESHOLD
                for match in matches
            ):
                duplicate_open_count += 1

    duplicate_ratio = (
        duplicate_open_count / total
    )

    # ---------------------------------------------------------------
    # Resolution speed
    # ---------------------------------------------------------------

    resolution_hours = [
        (
            bug.resolved_at - bug.created_at
        ).total_seconds() / 3600
        for bug in resolved_bugs
        if bug.resolved_at and bug.created_at
    ]

    avg_resolution_hours = (
        round(
            sum(resolution_hours)
            / len(resolution_hours),
            1,
        )
        if resolution_hours
        else 0.0
    )

    # ---------------------------------------------------------------
    # Penalties
    # ---------------------------------------------------------------

    open_penalty = round(
        min(
            25.0,
            open_ratio * 25.0,
        ),
        1,
    )

    critical_penalty = round(
        min(
            35.0,
            critical_ratio * 100,
        ),
        1,
    )

    duplicate_penalty = round(
        min(
            15.0,
            duplicate_ratio * 30.0,
        ),
        1,
    )

    resolution_penalty = (
        round(
            min(
                25.0,
                max(
                    0.0,
                    (
                        avg_resolution_hours
                        - RESOLUTION_BASELINE_HOURS
                    )
                    / 4.0,
                ),
            ),
            1,
        )
        if resolution_hours
        else 0.0
    )

    score = round(
        100
        - (
            open_penalty
            + critical_penalty
            + duplicate_penalty
            + resolution_penalty
        )
    )

    score = max(
        0,
        min(
            100,
            score,
        ),
    )

    breakdown = [
        HealthScoreBreakdown(
            "Open bugs",
            -open_penalty,
            (
                f"{len(open_bugs)} of {total} bugs are "
                f"Open/In Progress "
                f"({open_ratio * 100:.0f}%)."
            ),
        ),
        HealthScoreBreakdown(
            "Critical bugs unresolved",
            -critical_penalty,
            (
                f"{len(critical_open)} "
                "Critical-severity bugs are still open."
            ),
        ),
        HealthScoreBreakdown(
            "Likely duplicates open",
            -duplicate_penalty,
            (
                f"{duplicate_open_count} open bugs "
                "closely match an already-resolved bug."
            ),
        ),
        HealthScoreBreakdown(
            "Resolution speed",
            -resolution_penalty,
            (
                f"Average resolution time is "
                f"{avg_resolution_hours}h"
                + (
                    " (no resolved bugs yet)."
                    if not resolution_hours
                    else "."
                )
            ),
        ),
    ]

    return HealthScoreResult(
        score=score,
        status=_status_for(score),
        total_bugs=total,
        open_bugs=len(open_bugs),
        critical_open_bugs=len(
            critical_open
        ),
        resolved_bugs=len(
            resolved_bugs
        ),
        resolved_pct=resolved_pct,
        likely_duplicate_open_bugs=(
            duplicate_open_count
        ),
        avg_resolution_hours=(
            avg_resolution_hours
        ),
        breakdown=breakdown,
    )


# ===================================================================
# INDIVIDUAL BUG RISK SCORE
# ===================================================================

@dataclass
class BugRiskFactor:
    label: str
    points: int
    detail: str


@dataclass
class BugRiskScoreResult:
    score: int
    level: str
    summary: str
    factors: List[BugRiskFactor] = field(
        default_factory=list
    )


def _normalize(value: Optional[str]) -> str:
    """
    Convert enum/string-like values to a predictable lowercase string.
    """

    if value is None:
        return ""

    if hasattr(value, "value"):
        value = value.value

    return str(value).strip().lower()


def _risk_level(score: int) -> str:
    """
    Convert numerical bug risk to a human-readable category.
    """

    if score >= 80:
        return "Critical"

    if score >= 60:
        return "High"

    if score >= 40:
        return "Medium"

    if score >= 20:
        return "Low"

    return "Minimal"


def compute_bug_risk_score(
    severity: Optional[str] = None,
    priority: Optional[str] = None,
    root_cause_confidence: Optional[float] = None,
    duplicate_similarity: Optional[float] = None,
    exception_type: Optional[str] = None,
    failure_file: Optional[str] = None,
    failure_line: Optional[str] = None,
    recurrence_count: int = 0,
) -> BugRiskScoreResult:
    """
    Compute a risk score between 0 and 100 for one bug.

    Higher score = higher engineering / operational risk.

    Maximum contribution:

    Severity               35
    Priority               20
    Root-cause confidence  15
    Duplicate / recurrence 15
    Exception type         10
    Failure localization    5

    Total                  100
    """

    score = 0
    factors: List[BugRiskFactor] = []

    severity_value = _normalize(
        severity
    )

    priority_value = _normalize(
        priority
    )

    exception_value = _normalize(
        exception_type
    )

    # ---------------------------------------------------------------
    # 1. Severity — max 35
    # ---------------------------------------------------------------

    severity_points = {
        "critical": 35,
        "high": 26,
        "medium": 16,
        "low": 7,
    }

    severity_score = severity_points.get(
        severity_value,
        8,
    )

    score += severity_score

    factors.append(
        BugRiskFactor(
            label="Severity",
            points=severity_score,
            detail=(
                f"Bug severity is "
                f"{severity_value or 'unknown'}."
            ),
        )
    )

    # ---------------------------------------------------------------
    # 2. Priority — max 20
    # Supports both P0-P3 and textual priorities.
    # ---------------------------------------------------------------

    priority_points = {
        "p0": 20,
        "critical": 20,

        "p1": 16,
        "high": 16,

        "p2": 10,
        "medium": 10,

        "p3": 4,
        "low": 4,
    }

    priority_score = priority_points.get(
        priority_value,
        5,
    )

    score += priority_score

    factors.append(
        BugRiskFactor(
            label="Priority",
            points=priority_score,
            detail=(
                f"Assigned priority is "
                f"{priority_value or 'unknown'}."
            ),
        )
    )

    # ---------------------------------------------------------------
    # 3. Root-cause confidence — max 15
    # ---------------------------------------------------------------

    confidence = (
        float(root_cause_confidence)
        if root_cause_confidence
        is not None
        else 0.0
    )

    # Handle values returned as 0-1
    if 0 < confidence <= 1:
        confidence *= 100

    if confidence >= 85:
        confidence_score = 15

    elif confidence >= 70:
        confidence_score = 12

    elif confidence >= 50:
        confidence_score = 8

    elif confidence > 0:
        confidence_score = 4

    else:
        confidence_score = 0

    score += confidence_score

    if confidence_score:
        factors.append(
            BugRiskFactor(
                label=(
                    "Root Cause Confidence"
                ),
                points=confidence_score,
                detail=(
                    "AI root-cause confidence is "
                    f"{confidence:.0f}%."
                ),
            )
        )

    # ---------------------------------------------------------------
    # 4. Duplicate / historical recurrence — max 15
    # ---------------------------------------------------------------

    duplicate_score = 0

    similarity = (
        float(duplicate_similarity)
        if duplicate_similarity
        is not None
        else 0.0
    )

    # Some models may return 0-1 similarity
    if 0 < similarity <= 1:
        similarity *= 100

    if similarity >= 90:
        duplicate_score = 12

    elif similarity >= 75:
        duplicate_score = 9

    elif similarity >= 50:
        duplicate_score = 6

    elif similarity > 0:
        duplicate_score = 2

    recurrence_bonus = min(
        3,
        max(
            0,
            int(recurrence_count),
        ),
    )

    duplicate_score += recurrence_bonus

    duplicate_score = min(
        15,
        duplicate_score,
    )

    score += duplicate_score

    if duplicate_score:
        factors.append(
            BugRiskFactor(
                label=(
                    "Historical Recurrence"
                ),
                points=duplicate_score,
                detail=(
                    f"Best historical similarity: "
                    f"{similarity:.0f}%. "
                    f"Recurrence count: "
                    f"{recurrence_count}."
                ),
            )
        )

    # ---------------------------------------------------------------
    # 5. Exception / failure type — max 10
    # ---------------------------------------------------------------

    critical_exception_keywords = [
        "memoryerror",
        "outofmemory",
        "segmentation",
        "accessviolation",
        "security",
        "authentication",
        "authorization",
        "permission",
        "database",
        "deadlock",
        "fatal",
    ]

    significant_exception_keywords = [
        "zerodivision",
        "nullpointer",
        "nullreference",
        "typeerror",
        "valueerror",
        "indexerror",
        "keyerror",
        "timeout",
        "connection",
        "runtime",
        "panic",
    ]

    exception_score = 0

    if any(
        keyword in exception_value
        for keyword
        in critical_exception_keywords
    ):
        exception_score = 10

    elif any(
        keyword in exception_value
        for keyword
        in significant_exception_keywords
    ):
        exception_score = 6

    elif exception_value:
        exception_score = 3

    score += exception_score

    if exception_score:
        factors.append(
            BugRiskFactor(
                label="Failure Type",
                points=exception_score,
                detail=(
                    f"Detected exception: "
                    f"{exception_type}."
                ),
            )
        )

    # ---------------------------------------------------------------
    # 6. Failure localization — max 5
    #
    # A precise location makes the diagnosis more actionable,
    # but also confirms that execution reached a concrete failure.
    # ---------------------------------------------------------------

    localization_score = 0

    if failure_file and failure_line:
        localization_score = 5

    elif failure_file or failure_line:
        localization_score = 2

    score += localization_score

    if localization_score:
        location = (
            f"{failure_file or 'unknown file'}:"
            f"{failure_line or '?'}"
        )

        factors.append(
            BugRiskFactor(
                label="Failure Point",
                points=localization_score,
                detail=(
                    f"Failure localized to "
                    f"{location}."
                ),
            )
        )

    # ---------------------------------------------------------------
    # Final normalization
    # ---------------------------------------------------------------

    score = max(
        0,
        min(
            100,
            round(score),
        ),
    )

    level = _risk_level(
        score
    )

    # ---------------------------------------------------------------
    # Human-readable result
    # ---------------------------------------------------------------

    if level == "Critical":
        summary = (
            "Immediate attention recommended. "
            "This bug has a high potential "
            "impact or recurrence risk."
        )

    elif level == "High":
        summary = (
            "Prioritize this bug for investigation "
            "and remediation."
        )

    elif level == "Medium":
        summary = (
            "The bug presents moderate risk and "
            "should be handled within the normal "
            "development cycle."
        )

    elif level == "Low":
        summary = (
            "The bug currently presents limited "
            "operational risk."
        )

    else:
        summary = (
            "The available evidence indicates "
            "minimal current risk."
        )

    return BugRiskScoreResult(
        score=score,
        level=level,
        summary=summary,
        factors=factors,
    )