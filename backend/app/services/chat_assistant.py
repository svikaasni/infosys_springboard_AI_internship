"""
AI Chat Assistant
-------------------
Answers natural-language questions about the bug knowledge base by routing
to the same building blocks used elsewhere in the app — the 5 agents and
direct database queries — rather than a hosted generative LLM (this repo
has no LLM API key configured; see README for the swap-in point if one
becomes available).

This is intent-matching, not open-ended generation: each supported question
type is recognized by keywords, then answered with real, grounded data.
Anything outside the recognized intents gets a helpful "here's what I can
do" fallback rather than a fabricated answer — which is a more honest
design than pattern-matching everything into a plausible-sounding guess.

Supported intents (see the project brief's examples):
  - "show similar bugs [to #12]"        -> Duplicate Detection Agent
  - "explain this stack trace: ..."     -> Log Analysis Agent
  - "why did [bug #12] happen"          -> Root Cause Agent (needs a resolved corpus)
  - "suggest a fix [for #12]"           -> Remediation Agent
  - "list critical bugs"                -> direct query
  - "what's the health score"           -> Health Score service
  - anything else                       -> capability summary
"""
import re
from dataclasses import dataclass
from typing import Optional, List

from sqlalchemy.orm import Session

from app import models
from app.agents.duplicate_detection import DuplicateDetectionAgent
from app.agents.log_analysis import LogAnalysisAgent
from app.agents.root_cause import RootCauseAgent
from app.agents.remediation import RemediationAgent
from app.services.health_score import compute_health_score

BUG_ID_PATTERN = re.compile(r"#(\d+)|bug\s+(\d+)", re.IGNORECASE)


@dataclass
class ChatReply:
    reply: str
    related_bug_ids: List[int]


def _extract_bug_id(message: str) -> Optional[int]:
    m = BUG_ID_PATTERN.search(message)
    if not m:
        return None
    return int(m.group(1) or m.group(2))


def _corpus_excluding(db: Session, exclude_id: Optional[int]) -> List[dict]:
    q = db.query(models.Bug)
    if exclude_id is not None:
        q = q.filter(models.Bug.id != exclude_id)
    return [
        {
            "id": b.id,
            "title": b.title,
            "description": b.description,
            "status": b.status.value if hasattr(b.status, "value") else b.status,
            "resolution_notes": b.resolution_notes,
        }
        for b in q.all()
    ]


class ChatAssistant:
    def __init__(self):
        self.dup_agent = DuplicateDetectionAgent()
        self.log_agent = LogAnalysisAgent()
        self.root_cause_agent = RootCauseAgent()
        self.remediation_agent = RemediationAgent()

    def respond(self, db: Session, message: str, context_bug_id: Optional[int] = None) -> ChatReply:
        text = message.lower().strip()
        bug_id = _extract_bug_id(message) or context_bug_id

        if any(kw in text for kw in ["critical bug", "list critical", "show critical"]):
            return self._list_critical(db)

        if "health" in text and ("score" in text or "status" in text):
            return self._health_score(db)

        if "similar" in text or "duplicate" in text:
            return self._similar_bugs(db, bug_id)

        if "explain" in text and ("trace" in text or "stack" in text or "log" in text):
            return self._explain_stack_trace(db, message, bug_id)

        if text.startswith("why") or "root cause" in text or "happen" in text:
            return self._why_did_this_happen(db, bug_id)

        if "fix" in text or "remediat" in text or "suggest" in text:
            return self._suggest_fix(db, bug_id)

        return ChatReply(
            reply=(
                "I can help with a few things — try asking me:\n"
                "• \"List critical bugs\"\n"
                "• \"Show similar bugs to #12\"\n"
                "• \"Explain this stack trace: <paste it>\"\n"
                "• \"Why did bug #12 happen?\"\n"
                "• \"Suggest a fix for #12\"\n"
                "• \"What's the project health score?\""
            ),
            related_bug_ids=[],
        )

    # ---------- intent handlers ----------

    def _list_critical(self, db: Session) -> ChatReply:
        bugs = (
            db.query(models.Bug)
            .filter(models.Bug.severity == models.SeverityEnum.critical)
            .filter(models.Bug.status.in_([models.StatusEnum.open, models.StatusEnum.in_progress]))
            .order_by(models.Bug.created_at.desc())
            .limit(10)
            .all()
        )
        if not bugs:
            return ChatReply("No open Critical-severity bugs right now — nice.", [])
        lines = [f"• #{b.id} — {b.title} ({b.status.value})" for b in bugs]
        return ChatReply(
            f"There {'is' if len(bugs) == 1 else 'are'} {len(bugs)} open Critical bug{'s' if len(bugs) != 1 else ''}:\n" + "\n".join(lines),
            [b.id for b in bugs],
        )

    def _health_score(self, db: Session) -> ChatReply:
        result = compute_health_score(db)
        return ChatReply(
            f"Project health score: {result.score}/100 ({result.status}).\n"
            f"{result.open_bugs} open, {result.critical_open_bugs} of those Critical, "
            f"{result.resolved_pct}% resolved overall, average resolution time {result.avg_resolution_hours}h.",
            [],
        )

    def _similar_bugs(self, db: Session, bug_id: Optional[int]) -> ChatReply:
        if bug_id is None:
            return ChatReply("Tell me which bug — e.g. \"show similar bugs to #12\".", [])
        bug = db.query(models.Bug).filter(models.Bug.id == bug_id).first()
        if not bug:
            return ChatReply(f"I couldn't find bug #{bug_id}.", [])
        corpus = _corpus_excluding(db, exclude_id=bug.id)
        matches = self.dup_agent.run(f"{bug.title} {bug.description}", corpus, top_k=5)
        if not matches:
            return ChatReply(f"No similar bugs found for #{bug_id} yet.", [])
        lines = [f"• #{m.bug_id} — {m.title} ({m.similarity:.0f}% similar, {m.status})" for m in matches]
        return ChatReply(f"Bugs similar to #{bug_id}:\n" + "\n".join(lines), [m.bug_id for m in matches])

    def _explain_stack_trace(self, db: Session, message: str, bug_id: Optional[int]) -> ChatReply:
        trace = None
        if ":" in message:
            trace = message.split(":", 1)[1].strip()
        if not trace and bug_id is not None:
            bug = db.query(models.Bug).filter(models.Bug.id == bug_id).first()
            trace = bug.stack_trace if bug else None
        if not trace:
            return ChatReply("Paste the stack trace after a colon, e.g. \"explain this stack trace: TypeError: ...\".", [])

        result = self.log_agent.run(trace)
        if not result.exception_type:
            return ChatReply(f"I couldn't recognize a specific exception pattern in that trace. Summary: {result.summary}", [])
        location = f"{result.failure_file}:{result.failure_line}" if result.failure_file else "an unknown location"
        return ChatReply(
            f"That's a {result.exception_type}, raised at {location}"
            f"{f' in {result.failure_function}()' if result.failure_function else ''}. {result.summary}",
            [],
        )

    def _why_did_this_happen(self, db: Session, bug_id: Optional[int]) -> ChatReply:
        if bug_id is None:
            return ChatReply("Tell me which bug — e.g. \"why did bug #12 happen?\".", [])
        bug = db.query(models.Bug).filter(models.Bug.id == bug_id).first()
        if not bug:
            return ChatReply(f"I couldn't find bug #{bug_id}.", [])

        corpus = _corpus_excluding(db, exclude_id=bug.id)
        matches = self.dup_agent.run(f"{bug.title} {bug.description}", corpus, top_k=5)
        log_result = self.log_agent.run(bug.stack_trace)
        root_cause = self.root_cause_agent.run(
            similar_resolved=matches,
            exception_type=log_result.exception_type,
            category=bug.category or "General",
        )
        related = root_cause.grounded_in
        return ChatReply(f"{root_cause.explanation}\n\n(Confidence: {root_cause.confidence}%)", related)

    def _suggest_fix(self, db: Session, bug_id: Optional[int]) -> ChatReply:
        if bug_id is None:
            return ChatReply("Tell me which bug — e.g. \"suggest a fix for #12\".", [])
        bug = db.query(models.Bug).filter(models.Bug.id == bug_id).first()
        if not bug:
            return ChatReply(f"I couldn't find bug #{bug_id}.", [])

        corpus = _corpus_excluding(db, exclude_id=bug.id)
        matches = self.dup_agent.run(f"{bug.title} {bug.description}", corpus, top_k=5)
        log_result = self.log_agent.run(bug.stack_trace)
        remediation = self.remediation_agent.run(
            similar_resolved=matches,
            exception_type=log_result.exception_type,
            category=bug.category or "General",
            severity=bug.severity.value if hasattr(bug.severity, "value") else bug.severity,
        )
        tips = "; ".join(remediation.best_practices[:2])
        return ChatReply(
            f"{remediation.suggested_fix}\n\nBest practices: {tips}\nEstimated fix time: {remediation.estimated_fix_time_hours}h",
            remediation.grounded_in,
        )
