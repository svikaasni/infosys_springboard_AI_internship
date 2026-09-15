"""
Triage Agent
------------
Predicts severity, priority, and category for a newly submitted bug by
scoring its title, description, and stack trace against weighted keyword
signals. This is a transparent, explainable heuristic classifier rather
than a black-box model — appropriate for a knowledge base that starts
small and needs to be useful from bug #1, before there's enough labeled
history to train a supervised model.

Swap point: once enough resolved+labeled bugs accumulate, this scoring
function can be replaced with a trained classifier (e.g. scikit-learn
LogisticRegression over TF-IDF features) without changing the agent's
public interface (`TriageAgent.run`).
"""
from dataclasses import dataclass
from typing import Optional

# Keyword → severity weight. Higher weight = stronger signal of severity.
SEVERITY_SIGNALS = {
    "Critical": [
        "crash", "data loss", "corrupt", "security", "breach", "exploit",
        "production down", "outage", "cannot login", "payment fail",
        "unauthorized access", "sql injection", "deadlock", "fatal",
        "segmentation fault", "memory leak", "down for all users",
    ],
    "High": [
        "exception", "error", "fail", "broken", "not working", "500",
        "null pointer", "nullreferenceexception", "timeout", "regression",
        "blocking", "major", "incorrect data", "unresponsive",
    ],
    "Medium": [
        "warning", "slow", "delay", "minor bug", "ui glitch", "edge case",
        "intermittent", "sometimes", "occasionally",
    ],
    "Low": [
        "typo", "cosmetic", "styling", "css", "spacing", "color", "text",
        "suggestion", "enhancement", "nice to have", "documentation",
    ],
}

PRIORITY_FROM_SEVERITY = {
    "Critical": "P0",
    "High": "P1",
    "Medium": "P2",
    "Low": "P3",
}

CATEGORY_SIGNALS = {
    "Frontend": ["react", "css", "html", "button", "ui", "component", "render", "jsx", "browser", "layout"],
    "Backend": ["api", "endpoint", "server", "fastapi", "flask", "django", "route", "controller", "service"],
    "Database": ["sql", "query", "migration", "database", "table", "index", "constraint", "orm", "deadlock"],
    "Infra": ["docker", "deployment", "ci/cd", "pipeline", "kubernetes", "nginx", "cors", "env", "config", "server down"],
    "API": ["rest", "graphql", "json", "request", "response", "401", "403", "404", "500", "webhook"],
    "Mobile": ["android", "ios", "flutter", "react native", "app crash", "mobile"],
}


@dataclass
class TriageResult:
    severity: str
    priority: str
    category: str
    confidence: int  # 0-100
    reasoning: str


class TriageAgent:
    name = "Triage Agent"

    def run(self, title: str, description: str, stack_trace: Optional[str] = None) -> TriageResult:
        text = f"{title} {description} {stack_trace or ''}".lower()

        severity_scores = {level: 0 for level in SEVERITY_SIGNALS}
        matched_terms = {level: [] for level in SEVERITY_SIGNALS}
        for level, keywords in SEVERITY_SIGNALS.items():
            for kw in keywords:
                if kw in text:
                    severity_scores[level] += 1
                    matched_terms[level].append(kw)

        # Stack trace presence itself nudges severity up (something actually broke).
        if stack_trace and stack_trace.strip():
            severity_scores["High"] += 1

        best_severity = max(severity_scores, key=severity_scores.get)
        if severity_scores[best_severity] == 0:
            best_severity = "Medium"  # default when no signal fires

        total_hits = sum(severity_scores.values())
        confidence = min(95, 45 + severity_scores[best_severity] * 15) if total_hits else 40

        priority = PRIORITY_FROM_SEVERITY[best_severity]

        category_scores = {cat: 0 for cat in CATEGORY_SIGNALS}
        cat_matches = {cat: [] for cat in CATEGORY_SIGNALS}
        for cat, keywords in CATEGORY_SIGNALS.items():
            for kw in keywords:
                if kw in text:
                    category_scores[cat] += 1
                    cat_matches[cat].append(kw)

        best_category = max(category_scores, key=category_scores.get)
        if category_scores[best_category] == 0:
            best_category = "Uncategorized"

        matched = matched_terms.get(best_severity, [])
        reasoning_parts = []
        if matched:
            reasoning_parts.append(f"matched severity signals: {', '.join(matched[:4])}")
        else:
            reasoning_parts.append("no strong severity keywords found; defaulted to Medium")
        if cat_matches.get(best_category):
            reasoning_parts.append(f"matched category signals: {', '.join(cat_matches[best_category][:4])}")
        if stack_trace and stack_trace.strip():
            reasoning_parts.append("a stack trace was attached, which raises confidence of a real failure")

        reasoning = "; ".join(reasoning_parts) + "."

        return TriageResult(
            severity=best_severity,
            priority=priority,
            category=best_category,
            confidence=confidence,
            reasoning=reasoning,
        )
