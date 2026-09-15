def _create_bug(client, headers, **overrides):
    payload = {
        "title": "Sample bug",
        "description": "Something went wrong.",
        "category": "Backend",
        "severity": "Medium",
        "priority": "P2",
    }
    payload.update(overrides)
    resp = client.post("/api/bugs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_knowledge_base_empty_when_nothing_resolved(client, auth_headers):
    _create_bug(client, auth_headers)  # still Open
    resp = client.get("/api/knowledge-base", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


def test_knowledge_base_excludes_resolved_without_notes(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    client.patch(f"/api/bugs/{bug['id']}", json={"status": "Resolved"}, headers=auth_headers)
    resp = client.get("/api/knowledge-base", headers=auth_headers)
    assert resp.json()["total"] == 0


def test_knowledge_base_includes_resolved_with_notes(client, auth_headers):
    bug = _create_bug(client, auth_headers, title="Checkout crash")
    client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Added a null check."},
        headers=auth_headers,
    )
    resp = client.get("/api/knowledge-base", headers=auth_headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Checkout crash"
    assert body["items"][0]["resolution_notes"] == "Added a null check."


def test_knowledge_base_search(client, auth_headers):
    bug1 = _create_bug(client, auth_headers, title="Login timeout")
    client.patch(f"/api/bugs/{bug1['id']}", json={"status": "Resolved", "resolution_notes": "Increased timeout."}, headers=auth_headers)
    bug2 = _create_bug(client, auth_headers, title="Dashboard flicker")
    client.patch(f"/api/bugs/{bug2['id']}", json={"status": "Closed", "resolution_notes": "Fixed CSS transition."}, headers=auth_headers)

    resp = client.get("/api/knowledge-base", params={"search": "timeout"}, headers=auth_headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Login timeout"


def test_knowledge_base_requires_auth(client):
    resp = client.get("/api/knowledge-base")
    assert resp.status_code == 401
