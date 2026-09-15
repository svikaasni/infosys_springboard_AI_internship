"""
Remediation Agent
------------------
Recommends a concrete fix approach, grounded first in what actually worked
for similar past bugs (retrieved from the knowledge base), then supplemented
with general best-practice guidance keyed off the exception type and
category. Also produces a rough fix-time estimate, which is deliberately
conservative and heuristic — it exists to help with sprint planning, not as
a guarantee.
"""
from dataclasses import dataclass
from typing import List, Optional

from app.agents.duplicate_detection import DuplicateMatch

BEST_PRACTICES = {
    "NullPointerException": [
        "Add a null/None check before dereferencing the value.",
        "Prefer optional-chaining or default values at the boundary where the value first enters your code.",
    ],
    "TypeError": [
        "Validate input types at function boundaries, especially for external/API input.",
        "Add a guard clause for null/undefined before property access.",
    ],
    "KeyError": [
        "Use `.get(key, default)` instead of direct indexing where the key may be absent.",
        "Validate the expected schema of incoming data before processing it.",
    ],
    "IndexError": [
        "Check `len()` before indexing, or use safe slicing instead of direct index access.",
    ],
    "AttributeError": [
        "Confirm the object's type/shape before calling methods on it — it may be None or a different type than expected.",
    ],
    "ConnectionError": [
        "Add retries with exponential backoff for transient network failures.",
        "Add a circuit breaker or timeout so one failing dependency doesn't cascade.",
    ],
    "TimeoutError": [
        "Profile the slow call; consider caching, indexing, or async execution.",
        "Set an explicit, sane timeout instead of relying on defaults.",
    ],
    "IntegrityError": [
        "Validate uniqueness/foreign-key constraints in application code before the write, with a clear user-facing error.",
        "Wrap the write in a transaction and handle the constraint violation explicitly.",
    ],
    "PermissionError": [
        "Verify the authorization check happens before the operation, not after.",
    ],
}

CATEGORY_BEST_PRACTICES = {
    "Frontend": ["Add an error boundary around this component so one failure doesn't blank the whole page."],
    "Backend": ["Add a regression test that reproduces this exact input before closing the ticket."],
    "Database": ["Check whether a migration or index is needed alongside the code fix."],
    "Infra": ["Confirm the fix in staging under production-like config before rolling out."],
    "API": ["Add input validation at the API boundary and return a clear 4xx instead of a 500."],
    "Mobile": ["Test the fix on both the oldest and newest supported OS versions."],
}

import re
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

from app.agents.duplicate_detection import DuplicateMatch

CODE_TEMPLATES = {
    "Null Pointer / Missing Value": {
        "buggy": "result = data['profile']['address']['city']",
        "fixed": "result = data.get('profile', {}).get('address', {}).get('city', 'Unknown City') if data else 'Unknown City'",
    },
    "Database / SQL": {
        "buggy": 'query = f"SELECT * FROM users WHERE user_id = \'{search_id}\'"',
        "fixed": 'query = "SELECT * FROM users WHERE user_id = ?"\ncursor.execute(query, (search_id,))',
    },
    "Network / API": {
        "buggy": "response = requests.get(api_url)",
        "fixed": "try:\n    response = requests.get(api_url, timeout=5.0)\n    response.raise_for_status()\nexcept requests.exceptions.RequestException as e:\n    return {'error': str(e), 'status': 'fallback_offline'}",
    },
    "Frontend": {
        "buggy": "const items = payload.results;\ndocument.getElementById('bug-list').innerHTML = items.map(x => `<li>${x.title}</li>`).join('');",
        "fixed": "const listEl = document.getElementById('bug-list');\nif (!listEl) return;\nconst items = payload?.results ?? [];\nlistEl.innerHTML = items.map(x => `<li>${x?.title ?? ''}</li>`).join('');",
    },
    "Arithmetic": {
        "buggy": "return a / b",
        "fixed": "if b == 0:\n    raise ValueError('Denominator cannot be zero')\nreturn a / b",
    },
    "General": {
        "buggy": "# Unhandled frame execution\nprocess_event(record)",
        "fixed": "# Safe execution guard applied\ntry:\n    process_event(record)\nexcept Exception as err:\n    logger.error(f'Handled execution error: {err}')\n    return None",
    },
}

SEVERITY_BASE_HOURS = {"Critical": 4, "High": 6, "Medium": 10, "Low": 16}


@dataclass
class RemediationResult:
    suggested_fix: str
    best_practices: List[str]
    prevention_tips: List[str]
    estimated_fix_time_hours: float
    grounded_in: List[int]
    code_diff: Optional[Dict[str, str]] = None


class RemediationAgent:
    name = "Remediation Agent"

    def _generate_code_diff(
        self,
        category: str,
        exception_type: Optional[str],
        failure_file: Optional[str],
        failure_line: Optional[str],
        failure_function: Optional[str],
        stack_trace: Optional[str],
    ) -> Dict[str, str]:
        filename = failure_file or ("src/main.js" if "Frontend" in category else "src/app.py")
        line_num = str(failure_line or "42")
        func_name = failure_function or "process_event"

        exc_str = (exception_type or "").lower()
        if any(k in exc_str for k in ["zerodivision", "division", "arithmetic"]):
            tpl_key = "Arithmetic"
        elif any(k in exc_str for k in ["nullpointer", "nonetype", "typeerror", "keyerror", "attributeerror"]):
            tpl_key = "Null Pointer / Missing Value"
        elif any(k in exc_str or k in category.lower() for k in ["database", "sql", "integrity", "connection"]):
            tpl_key = "Database / SQL"
        elif any(k in exc_str or k in category.lower() for k in ["timeout", "api", "network", "http"]):
            tpl_key = "Network / API"
        elif "frontend" in category.lower() or any(k in exc_str for k in ["dom", "react", "render"]):
            tpl_key = "Frontend"
        else:
            tpl_key = "General"

        tpl = CODE_TEMPLATES.get(tpl_key, CODE_TEMPLATES["General"])
        buggy_code = tpl["buggy"]
        fixed_code = tpl["fixed"]

        # If stack trace has code lines, extract them
        extracted_line = ""
        if stack_trace:
            lines = stack_trace.splitlines()
            for i, l in enumerate(lines):
                if "line " in l.lower() and i + 1 < len(lines) and not lines[i + 1].strip().lower().startswith("file"):
                    extracted_line = lines[i + 1].strip()
                    break

        if extracted_line and len(extracted_line) > 4:
            buggy_code = f"# File: {filename} (line {line_num})\ndef {func_name}():\n    # Captured error frame:\n    {extracted_line}"
            if tpl_key == "Null Pointer / Missing Value":
                var_name = extracted_line.split("=")[0].strip() if "=" in extracted_line else "data"
                fixed_code = f"# File: {filename} (line {line_num})\ndef {func_name}():\n    # Safe guard applied\n    if locals().get('{var_name}') is not None:\n        {extracted_line}\n    else:\n        return None"
            elif tpl_key == "Arithmetic":
                fixed_code = f"# File: {filename} (line {line_num})\ndef {func_name}():\n    # Guard against invalid division\n    if b == 0:\n        return 0\n    {extracted_line}"
            else:
                fixed_code = f"# File: {filename} (line {line_num})\ndef {func_name}():\n    # Refactored safe code block\n    try:\n        {extracted_line}\n    except Exception as e:\n        return None"

        diff_text = f"--- Original: {filename}\n+++ Fixed: {filename}\n"
        for line in buggy_code.splitlines():
            diff_text += f"- {line}\n"
        for line in fixed_code.splitlines():
            diff_text += f"+ {line}\n"

        return {
            "filename": filename,
            "buggy": buggy_code,
            "fixed": fixed_code,
            "diff": diff_text,
        }

    def run(
        self,
        similar_resolved: List[DuplicateMatch],
        exception_type: Optional[str],
        category: str,
        severity: str,
        failure_file: Optional[str] = None,
        failure_line: Optional[str] = None,
        failure_function: Optional[str] = None,
        stack_trace: Optional[str] = None,
    ) -> RemediationResult:
        resolved_with_notes = [m for m in similar_resolved if m.status in ("Resolved", "Closed") and m.resolution_notes]
        best_practices = list(BEST_PRACTICES.get(exception_type or "", []))
        best_practices += CATEGORY_BEST_PRACTICES.get(category, [])
        if not best_practices:
            best_practices = ["Add a regression test that reproduces this bug before marking it resolved."]

        if resolved_with_notes:
            top = resolved_with_notes[0]
            suggested_fix = (
                f"The most similar resolved bug (#{top.bug_id}, \"{top.title}\", "
                f"{top.similarity:.0f}% similar) was fixed with: {top.resolution_notes.strip()[:280]} "
                f"— start by checking whether the same fix applies here."
            )
            grounded_in = [m.bug_id for m in resolved_with_notes[:3]]
            time_multiplier = 0.6
        else:
            suggested_fix = (
                f"No directly matching fix exists in the knowledge base yet. Based on the "
                f"{exception_type or 'reported'} failure in the {category} layer, start by "
                f"reproducing it locally with the same input/stack trace, then apply the "
                f"best practices below. Recording the fix here will help resolve similar bugs "
                f"faster next time."
            )
            grounded_in = []
            time_multiplier = 1.0

        prevention_tips = [
            "Add a regression test covering this exact scenario.",
            "Log this failure mode in the team's knowledge base with the fix, so duplicate detection can find it next time.",
        ]
        if category in CATEGORY_BEST_PRACTICES:
            prevention_tips.append(CATEGORY_BEST_PRACTICES[category][0])

        base_hours = SEVERITY_BASE_HOURS.get(severity, 10)
        estimated_hours = round(base_hours * time_multiplier, 1)

        code_diff = self._generate_code_diff(
            category=category,
            exception_type=exception_type,
            failure_file=failure_file,
            failure_line=failure_line,
            failure_function=failure_function,
            stack_trace=stack_trace,
        )

        return RemediationResult(
            suggested_fix=suggested_fix,
            best_practices=best_practices[:4],
            prevention_tips=prevention_tips[:3],
            estimated_fix_time_hours=estimated_hours,
            grounded_in=grounded_in,
            code_diff=code_diff,
        )
