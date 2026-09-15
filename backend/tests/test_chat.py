def _create_bug(client, headers, **overrides):
    payload = {
        "title": "Payment gateway down",
        "description": "Users cannot complete payment, fatal error on submit.",
        "severity": "Critical",
        "priority": "P0",
    }
    payload.update(overrides)
    resp = client.post("/api/bugs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_chat_requires_auth(client):
    resp = client.post("/api/chat", json={"message": "list critical bugs"})
    assert resp.status_code == 401


def test_chat_lists_critical_bugs(client, auth_headers):
    _create_bug(client, auth_headers)
    resp = client.post("/api/chat", json={"message": "list critical bugs"}, headers=auth_headers)
    assert resp.status_code == 200
    assert "Critical" in resp.json()["reply"]
    assert len(resp.json()["related_bug_ids"]) == 1


def test_chat_no_critical_bugs_message(client, auth_headers):
    resp = client.post("/api/chat", json={"message": "list critical bugs"}, headers=auth_headers)
    assert "No open Critical" in resp.json()["reply"]


def test_chat_health_score_intent(client, auth_headers):
    resp = client.post("/api/chat", json={"message": "what's the health score?"}, headers=auth_headers)
    assert "health score" in resp.json()["reply"].lower()


def test_chat_similar_bugs_intent(client, auth_headers):
    bug1 = _create_bug(client, auth_headers, title="Null pointer on checkout", description="Cart crash on empty checkout")
    client.patch(f"/api/bugs/{bug1['id']}", json={"status": "Resolved", "resolution_notes": "Added a null check."}, headers=auth_headers)
    bug2 = _create_bug(client, auth_headers, title="Cart crashes when empty", description="Cart crash on empty checkout submit")

    resp = client.post("/api/chat", json={"message": f"show similar bugs to #{bug2['id']}"}, headers=auth_headers)
    body = resp.json()
    assert bug1["id"] in body["related_bug_ids"]


def test_chat_similar_bugs_without_id_asks_for_clarification(client, auth_headers):
    resp = client.post("/api/chat", json={"message": "show similar bugs"}, headers=auth_headers)
    assert "which bug" in resp.json()["reply"].lower()


def test_chat_explain_stack_trace_intent(client, auth_headers):
    msg = "explain this stack trace: KeyError: 'user_id'\n at handler.py:88"
    resp = client.post("/api/chat", json={"message": msg}, headers=auth_headers)
    assert "KeyError" in resp.json()["reply"]


def test_chat_why_did_this_happen_intent(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.post("/api/chat", json={"message": f"why did bug #{bug['id']} happen"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["reply"]


def test_chat_suggest_fix_intent(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.post("/api/chat", json={"message": f"suggest a fix for #{bug['id']}"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["reply"]


def test_chat_unknown_intent_returns_capability_summary(client, auth_headers):
    resp = client.post("/api/chat", json={"message": "tell me a joke"}, headers=auth_headers)
    assert "I can help" in resp.json()["reply"]


def test_chat_uses_context_bug_id(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.post(
        "/api/chat",
        json={"message": "why did this happen", "context_bug_id": bug["id"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["reply"]
