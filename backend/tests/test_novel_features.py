import pytest


def _create_test_bug(client, headers, **overrides):
    payload = {
        "title": "Database connection pool timeout under peak load",
        "description": "SQLAlchemy pool exhausted when handling concurrent checkout requests.",
        "stack_trace": "TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00\n at sqlalchemy/pool/base.py:321",
        "category": "Backend",
        "severity": "High",
        "priority": "P1",
    }
    payload.update(overrides)
    resp = client.post("/api/bugs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_dry_run_scan_endpoint(client, auth_headers):
    """Verifies POST /api/bugs/dry-run returns immediate simulation with CoT thinking steps and telemetry."""
    payload = {
        "title": "NullPointerException in user authentication service",
        "description": "Failed to validate JWT claims before decoding principal.",
        "stack_trace": "java.lang.NullPointerException: Cannot invoke 'String.length()' because 'token' is null\n at AuthService.java:54",
        "category": "Backend",
        "ai_model": "Aegis-Agent",
        "temperature": 0.35,
        "top_p": 0.85,
        "deep_reasoning": True,
    }
    resp = client.post("/api/bugs/dry-run", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Core predictions
    assert data["predicted_severity"] in ["Critical", "High", "Medium", "Low"]
    assert "root_cause_hypothesis" in data
    assert data["confidence_score"] > 0
    assert "recommended_patch" in data

    # 3-Way code diff preview
    assert "code_diff" in data
    diff = data["code_diff"]
    assert "filename" in diff
    assert "buggy" in diff
    assert "fixed" in diff
    assert "diff" in diff

    # CoT thinking steps
    assert "thinking_steps" in data
    assert len(data["thinking_steps"]) >= 4

    # Telemetry
    assert "telemetry" in data
    assert data["telemetry"]["ai_model"] == "Aegis-Agent"
    assert data["telemetry"]["temperature"] == 0.35


def test_analyze_with_hyperparameter_tuning(client, auth_headers):
    """Verifies POST /api/bugs/{id}/analyze persists tuned hyperparameters, CoT steps, and code diff."""
    bug = _create_test_bug(client, auth_headers)

    tuning_payload = {
        "ai_model": "Nexus-Pro",
        "temperature": 0.4,
        "top_p": 0.9,
        "deep_reasoning": True,
    }

    resp = client.post(f"/api/bugs/{bug['id']}/analyze", json=tuning_payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    analysis = resp.json()

    # Telemetry and tuning metadata
    assert analysis["ai_model"] == "Nexus-Pro"
    assert analysis["tokens_used"] > 0
    assert "temp_settings" in analysis
    assert analysis["temp_settings"]["temperature"] == 0.4

    # CoT steps
    assert analysis["ai_thinking_steps"] is not None
    assert len(analysis["ai_thinking_steps"]) >= 4

    # Code diff object
    assert analysis["code_diff"] is not None
    assert "diff" in analysis["code_diff"]
    assert "buggy" in analysis["code_diff"]
    assert "fixed" in analysis["code_diff"]


def test_verify_patch_endpoint(client, auth_headers):
    """Verifies POST /api/bugs/{id}/verify executes sandbox verification and transitions status to Resolved."""
    bug = _create_test_bug(client, auth_headers)

    # First analyze so code_diff exists
    client.post(f"/api/bugs/{bug['id']}/analyze", json={"ai_model": "Quantum-7B"}, headers=auth_headers)

    # Verify patch
    verify_resp = client.post(f"/api/bugs/{bug['id']}/verify", json={}, headers=auth_headers)
    assert verify_resp.status_code == 200, verify_resp.text
    result = verify_resp.json()

    assert result["verified"] is True
    assert result["bug_status"] == "Resolved"
    assert len(result["logs"]) >= 3

    # Check bug record in database now has status Resolved
    detail_resp = client.get(f"/api/bugs/{bug['id']}", headers=auth_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["status"] == "Resolved"


def test_contextual_bug_chat(client, auth_headers):
    """Verifies POST /api/bugs/{id}/chat provides contextual answers and maintains history."""
    bug = _create_test_bug(client, auth_headers)
    client.post(f"/api/bugs/{bug['id']}/analyze", json={}, headers=auth_headers)

    # Ask for python fix
    chat_resp1 = client.post(
        f"/api/bugs/{bug['id']}/chat",
        json={"message": "Can you show me the safe fix for this in Python?"},
        headers=auth_headers,
    )
    assert chat_resp1.status_code == 200, chat_resp1.text
    chat_data1 = chat_resp1.json()
    assert "Python" in chat_data1["reply"] or "python" in chat_data1["reply"]
    assert len(chat_data1["history"]) == 2

    # Ask for regression test guidance
    chat_resp2 = client.post(
        f"/api/bugs/{bug['id']}/chat",
        json={"message": "How can we prevent this bug in the future and what regression tests should we write?"},
        headers=auth_headers,
    )
    assert chat_resp2.status_code == 200
    chat_data2 = chat_resp2.json()
    assert len(chat_data2["history"]) == 4
