"""
Root Cause Agent
-----------------
Reasons about the probable root cause of a bug, grounded in the team's own
historical defect knowledge — a retrieval-augmented approach (RAG) without
requiring a hosted generative LLM:

  1. RETRIEVE: take the resolved/closed bugs surfaced by the Duplicate
     Detection Agent (already ranked by semantic/lexical similarity).
  2. AUGMENT: pull out what actually fixed each of them, from
     `resolution_notes`.
  3. GENERATE: synthesize a plain-English root-cause explanation from that
     retrieved evidence using a template, plus a confidence score derived
     from how similar and how numerous the retrieved precedents are.

When no similar resolved bugs exist yet (a genuinely new failure mode),
the agent falls back to a rule-based explanation derived from the parsed
exception type and category, and says so plainly with a low confidence
score — this is the "cold start" case every knowledge base starts in.

Swap point: if a generative LLM becomes available (e.g. via an API key),
the retrieved evidence assembled here is exactly the context you'd pass
it — this agent's `run()` signature would not need to change.
"""
from dataclasses import dataclass
from typing import List, Optional

from app.agents.duplicate_detection import DuplicateMatch

EXCEPTION_HINTS = {
    "NullPointerException": "a value expected to be present was null/None at the point of use",
    "TypeError": "an operation was applied to a value of the wrong type, often a null/undefined reference",
    "KeyError": "code accessed a dictionary/map key that did not exist",
    "IndexError": "code accessed a list/array index outside its bounds",
    "AttributeError": "code called a method or accessed a field that doesn't exist on that object",
    "ConnectionError": "a downstream service, database, or network call was unreachable or timed out",
    "TimeoutError": "an operation exceeded its allotted time, often due to load or a blocking call",
    "ValueError": "a function received an argument of the right type but an invalid value",
    "IntegrityError": "a database constraint (unique, foreign key, not-null) was violated",
    "PermissionError": "the operation was attempted without sufficient permissions",
}


@dataclass
class RootCauseResult:
    explanation: str
    confidence: int  # 0-100
    grounded_in: List[int]  # bug IDs used as evidence


class RootCauseAgent:
    name = "Root Cause Agent"

    def run(
        self,
        similar_resolved: List[DuplicateMatch],
        exception_type: Optional[str],
        category: str,
    ) -> RootCauseResult:
        resolved_with_notes = [m for m in similar_resolved if m.status in ("Resolved", "Closed") and m.resolution_notes]

        if resolved_with_notes:
            top = resolved_with_notes[: min(3, len(resolved_with_notes))]
            avg_sim = sum(m.similarity for m in top) / len(top)

            lead = (
                f"Based on {len(top)} previously resolved bug"
                f"{'s' if len(top) > 1 else ''} with similar symptoms "
                f"(#{', #'.join(str(m.bug_id) for m in top)}), the probable root cause "
                f"follows the same pattern."
            )
            evidence_lines = [f"- Bug #{m.bug_id} (\"{m.title}\", {m.similarity:.0f}% similar) was fixed by: {m.resolution_notes.strip()[:220]}" for m in top]
            explanation = lead + "\n" + "\n".join(evidence_lines)

            confidence = min(92, int(avg_sim * 0.9) + len(top) * 3)
            return RootCauseResult(
                explanation=explanation,
                confidence=confidence,
                grounded_in=[m.bug_id for m in top],
            )

        # Cold start: no grounded precedent, reason from the parsed exception + category instead.
        hint = EXCEPTION_HINTS.get(exception_type or "", None)
        if hint:
            explanation = (
                f"No closely-matching resolved bug was found in the knowledge base yet, so this "
                f"explanation is inferred rather than retrieved. A {exception_type} in the "
                f"{category} layer typically means {hint}. Treat this as a starting hypothesis, "
                f"not a confirmed diagnosis."
            )
            confidence = 35
        else:
            explanation = (
                f"No similar resolved bug was found in the knowledge base yet, and the stack "
                f"trace didn't match a recognized exception pattern. Root cause is unknown until "
                f"this bug is investigated and resolved — once it is, resolving it will make this "
                f"analysis grounded for the next similar report."
            )
            confidence = 15

        return RootCauseResult(explanation=explanation, confidence=confidence, grounded_in=[])
