"""
Tests for the "Add Past Defect" feature (ported from Vamsi's project):
POST /api/bugs/manual-resolved, and the language/tags fields on Bug.
"""


def test_manual_resolved_defect_created_by_admin_appears_in_kb(client, auth_headers):
    # `auth_headers` is the first registered user in a fresh test db, which
    # the auth router automatically promotes to Admin.
    resp = client.post(
        "/api/bugs/manual-resolved",
        json={
            "title": "Legacy KeyError in auth module",
            "description": "Migrated from the old spreadsheet tracker.",
            "language": "Python",
            "category": "Backend",
            "tags": "auth, legacy-migration",
            "severity": "High",
            "root_cause": "Missing key check before dict access.",
            "fix_recommendation": "Use dict.get() with a default value.",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "Resolved"
    assert body["language"] == "Python"
    assert body["tags"] == "auth, legacy-migration"
    assert "Missing key check" in body["resolution_notes"]

    kb_resp = client.get("/api/knowledge-base", headers=auth_headers)
    assert kb_resp.status_code == 200
    titles = [item["title"] for item in kb_resp.json()["items"]]
    assert "Legacy KeyError in auth module" in titles


def test_manual_resolved_defect_requires_lead_or_admin(client, register):
    # First registered user becomes Admin (bootstrap)
    register(full_name="Admin User", email="admin@example.com")
    # Second registered user in this test db gets the default "Developer" role.
    token, _ = register(full_name="Dev User", email="dev@example.com")
    resp = client.post(
        "/api/bugs/manual-resolved",
        json={
            "title": "Should be rejected",
            "root_cause": "n/a",
            "fix_recommendation": "n/a",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_knowledge_base_language_filter(client, auth_headers):
    client.post(
        "/api/bugs/manual-resolved",
        json={
            "title": "Python defect",
            "language": "Python",
            "root_cause": "x",
            "fix_recommendation": "y",
        },
        headers=auth_headers,
    )
    client.post(
        "/api/bugs/manual-resolved",
        json={
            "title": "Java defect",
            "language": "Java",
            "root_cause": "x",
            "fix_recommendation": "y",
        },
        headers=auth_headers,
    )

    resp = client.get("/api/knowledge-base", params={"language": "Java"}, headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Java defect"

    langs_resp = client.get("/api/knowledge-base/languages", headers=auth_headers)
    assert langs_resp.status_code == 200
    assert set(langs_resp.json()) == {"Python", "Java"}


def test_bug_create_and_update_accept_language_and_tags(client, auth_headers):
    create_resp = client.post(
        "/api/bugs",
        json={
            "title": "Timeout in payment service",
            "description": "Requests time out under load.",
            "language": "Go",
            "tags": "timeout, payments",
            "severity": "High",
            "priority": "P1",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 201, create_resp.text
    bug = create_resp.json()
    assert bug["language"] == "Go"
    assert bug["tags"] == "timeout, payments"

    patch_resp = client.patch(
        f"/api/bugs/{bug['id']}",
        json={"language": "Rust", "tags": "timeout, rewritten"},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["language"] == "Rust"
    assert updated["tags"] == "timeout, rewritten"
