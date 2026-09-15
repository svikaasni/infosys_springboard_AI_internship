import io


def _create_bug(client, headers, **overrides):
    payload = {
        "title": "Checkout crashes on empty cart",
        "description": "TypeError thrown when cart.items is null.",
        "stack_trace": "TypeError: Cannot read properties of null (reading 'length')\n at Checkout.jsx:42",
        "category": "Frontend",
        "severity": "High",
        "priority": "P1",
    }
    payload.update(overrides)
    resp = client.post("/api/bugs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_bug(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    assert bug["title"] == "Checkout crashes on empty cart"
    assert bug["status"] == "Open"
    assert bug["reporter"]["email"] == "test@example.com"


def test_create_bug_requires_auth(client):
    resp = client.post("/api/bugs", json={"title": "x", "description": "y"})
    assert resp.status_code == 401


def test_list_bugs_pagination(client, auth_headers):
    for i in range(15):
        _create_bug(client, auth_headers, title=f"Bug {i}")

    resp = client.get("/api/bugs", params={"page": 1, "page_size": 10}, headers=auth_headers)
    body = resp.json()
    assert body["total"] == 15
    assert len(body["items"]) == 10

    resp2 = client.get("/api/bugs", params={"page": 2, "page_size": 10}, headers=auth_headers)
    assert len(resp2.json()["items"]) == 5


def test_list_bugs_filters_by_severity_and_search(client, auth_headers):
    _create_bug(client, auth_headers, title="Login fails", severity="Critical")
    _create_bug(client, auth_headers, title="Slow dashboard load", severity="Low")

    resp = client.get("/api/bugs", params={"severity": "Critical"}, headers=auth_headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Login fails"

    resp2 = client.get("/api/bugs", params={"search": "dashboard"}, headers=auth_headers)
    assert resp2.json()["total"] == 1


def test_get_bug_detail_includes_relations(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.get(f"/api/bugs/{bug['id']}", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["comments"] == []
    assert body["attachments"] == []
    assert len(body["events"]) == 1  # "created" event logged automatically
    assert body["events"][0]["event_type"] == "created"
    assert body["analysis"] is None


def test_get_bug_not_found(client, auth_headers):
    resp = client.get("/api/bugs/999999", headers=auth_headers)
    assert resp.status_code == 404


def test_update_bug_status_sets_resolved_at(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Fixed with a null check."},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "Resolved"
    assert body["resolved_at"] is not None
    assert body["resolution_notes"] == "Fixed with a null check."


def test_reopening_a_bug_clears_resolved_at(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    client.patch(f"/api/bugs/{bug['id']}", json={"status": "Resolved"}, headers=auth_headers)
    resp = client.patch(f"/api/bugs/{bug['id']}", json={"status": "Open"}, headers=auth_headers)
    assert resp.json()["resolved_at"] is None


def test_delete_bug(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.delete(f"/api/bugs/{bug['id']}", headers=auth_headers)
    assert resp.status_code == 204
    resp2 = client.get(f"/api/bugs/{bug['id']}", headers=auth_headers)
    assert resp2.status_code == 404


def test_assign_and_unassign_bug(client, register):
    token1, user1 = register(email="reporter@example.com")
    token2, user2 = register(email="assignee@example.com")
    headers1 = {"Authorization": f"Bearer {token1}"}

    bug = _create_bug(client, headers1)

    resp = client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": user2["id"]}, headers=headers1)
    assert resp.status_code == 200
    assert resp.json()["assignee"]["email"] == "assignee@example.com"

    resp2 = client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": None}, headers=headers1)
    assert resp2.json()["assignee"] is None


def test_assign_to_nonexistent_user_fails(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": 999999}, headers=auth_headers)
    assert resp.status_code == 404


def test_comment_flow(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.post(f"/api/bugs/{bug['id']}/comments", json={"body": "Reproduced on staging."}, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["body"] == "Reproduced on staging."

    detail = client.get(f"/api/bugs/{bug['id']}", headers=auth_headers).json()
    assert len(detail["comments"]) == 1
    assert any(e["event_type"] == "comment_added" for e in detail["events"])


def test_attachment_upload_accepts_allowed_extension(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    file_content = io.BytesIO(b"sample log content")
    resp = client.post(
        f"/api/bugs/{bug['id']}/attachments",
        files={"file": ("error.log", file_content, "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["filename"] == "error.log"


def test_attachment_upload_rejects_disallowed_extension(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    file_content = io.BytesIO(b"binary content")
    resp = client.post(
        f"/api/bugs/{bug['id']}/attachments",
        files={"file": ("malware.exe", file_content, "application/octet-stream")},
        headers=auth_headers,
    )
    assert resp.status_code == 400
