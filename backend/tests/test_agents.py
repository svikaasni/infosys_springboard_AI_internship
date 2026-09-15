from app.agents.triage import TriageAgent
from app.agents.log_analysis import LogAnalysisAgent
from app.agents.duplicate_detection import DuplicateDetectionAgent
from app.agents.root_cause import RootCauseAgent
from app.agents.remediation import RemediationAgent
from app.agents.orchestrator import AgentOrchestrator


def test_triage_agent_flags_critical_signals():
    agent = TriageAgent()
    result = agent.run(
        "App crashes on login",
        "Users cannot login at all, fatal error, complete outage.",
        "TypeError: Cannot read properties of null",
    )
    assert result.severity == "Critical"
    assert result.confidence > 0
    assert result.reasoning


def test_triage_agent_low_severity_for_cosmetic_issue():
    agent = TriageAgent()
    result = agent.run(
        "Button slightly misaligned",
        "The submit button is a few pixels off on the settings page.",
        None,
    )
    assert result.severity in ("Low", "Medium")


def test_log_analysis_parses_python_traceback():
    agent = LogAnalysisAgent()
    trace = 'Traceback (most recent call last):\n  File "app/handler.py", line 42, in process\n    raise KeyError("user_id")\nKeyError: \'user_id\''
    result = agent.run(trace)
    assert result.exception_type == "KeyError"
    assert result.failure_file == "app/handler.py"
    assert result.failure_line == "42"
    assert result.failure_function == "process"


def test_log_analysis_handles_no_stack_trace():
    agent = LogAnalysisAgent()
    result = agent.run(None)
    assert result.exception_type is None


def test_duplicate_detection_finds_similar_bug():
    agent = DuplicateDetectionAgent()
    corpus = [
        {
            "id": 1,
            "title": "Null pointer on checkout submit",
            "description": "Checkout crashes when the cart is empty and the user hits submit.",
            "status": "Resolved",
            "resolution_notes": "Added a null check.",
        },
        {
            "id": 2,
            "title": "Dashboard chart flickers",
            "description": "Chart.js canvas flickers when resizing the browser window.",
            "status": "Open",
            "resolution_notes": None,
        },
    ]
    results = agent.run("Cart crashes when checking out with an empty cart", corpus, top_k=5)
    assert len(results) >= 1
    assert results[0].bug_id == 1


def test_duplicate_detection_filters_out_noise():
    agent = DuplicateDetectionAgent()
    corpus = [
        {
            "id": 1,
            "title": "Completely unrelated database migration issue",
            "description": "A migration script failed on an unrelated table structure.",
            "status": "Open",
            "resolution_notes": None,
        }
    ]
    results = agent.run("Frontend button color is wrong on hover", corpus, top_k=5)
    # No real overlap in vocabulary — anything returned should be below the noise threshold, i.e. nothing.
    assert results == []


def test_duplicate_detection_empty_corpus():
    agent = DuplicateDetectionAgent()
    assert agent.run("anything", [], top_k=5) == []


def test_root_cause_grounded_when_similar_resolved_bug_exists():
    from app.agents.duplicate_detection import DuplicateMatch

    agent = RootCauseAgent()
    matches = [
        DuplicateMatch(bug_id=1, title="Null pointer on checkout", similarity=80.0, status="Resolved", resolution_notes="Added a null check for cart.items.")
    ]
    result = agent.run(similar_resolved=matches, exception_type="TypeError", category="Frontend")
    assert result.confidence > 50
    assert 1 in result.grounded_in
    assert "null check" in result.explanation


def test_root_cause_cold_start_has_low_confidence():
    agent = RootCauseAgent()
    result = agent.run(similar_resolved=[], exception_type="TypeError", category="Frontend")
    assert result.confidence < 50
    assert result.grounded_in == []


def test_root_cause_cold_start_unknown_exception_lowest_confidence():
    agent = RootCauseAgent()
    result = agent.run(similar_resolved=[], exception_type=None, category="Frontend")
    assert result.confidence <= 20


def test_remediation_grounded_fix_is_faster_than_cold_start():
    from app.agents.duplicate_detection import DuplicateMatch

    agent = RemediationAgent()
    grounded = agent.run(
        similar_resolved=[DuplicateMatch(bug_id=1, title="x", similarity=90.0, status="Resolved", resolution_notes="Fixed by adding validation.")],
        exception_type="TypeError",
        category="Frontend",
        severity="High",
    )
    cold = agent.run(similar_resolved=[], exception_type="TypeError", category="Frontend", severity="High")
    assert grounded.estimated_fix_time_hours < cold.estimated_fix_time_hours
    assert grounded.grounded_in == [1]
    assert cold.grounded_in == []


def test_remediation_best_practices_nonempty():
    agent = RemediationAgent()
    result = agent.run(similar_resolved=[], exception_type="KeyError", category="Backend", severity="Medium")
    assert len(result.best_practices) > 0
    assert len(result.prevention_tips) > 0


def test_orchestrator_runs_all_five_agents():
    orch = AgentOrchestrator()
    corpus = [
        {
            "id": 1,
            "title": "Null pointer on checkout submit",
            "description": "Checkout crashes when the cart is empty.",
            "status": "Resolved",
            "resolution_notes": "Added a null check for cart.items.",
        }
    ]
    result = orch.run(
        title="Cart page crashes when empty",
        description="Cart crashes with an error when clicking checkout on an empty cart.",
        stack_trace="TypeError: Cannot read properties of null (reading 'length')\n at Checkout.jsx:42",
        corpus=corpus,
    )
    assert result.triage.severity
    assert result.log_analysis.exception_type == "TypeError"
    assert len(result.duplicates) >= 1
    assert result.root_cause.explanation
    assert result.remediation.suggested_fix
