def test_notifications_require_auth(client):
    resp = client.get("/api/notifications")
    assert resp.status_code == 401


def test_no_notifications_initially(client, auth_headers):
    resp = client.get("/api/notifications", headers=auth_headers)
    body = resp.json()
    assert body["total"] == 0
    assert body["unread_count"] == 0


def test_assignment_notifies_assignee(client, register):
    reporter_token, _ = register(email="reporter@example.com")
    reporter_headers = {"Authorization": f"Bearer {reporter_token}"}
    assignee_token, assignee_user = register(email="assignee@example.com")
    assignee_headers = {"Authorization": f"Bearer {assignee_token}"}

    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=reporter_headers).json()
    client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": assignee_user["id"]}, headers=reporter_headers)

    resp = client.get("/api/notifications", headers=assignee_headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["unread_count"] == 1
    assert "assigned" in body["items"][0]["message"].lower()
    assert body["items"][0]["type"] == "bug_assigned"


def test_self_assignment_does_not_notify(client, register):
    token, user = register(email="self1@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=headers).json()
    client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": user["id"]}, headers=headers)

    resp = client.get("/api/notifications", headers=headers)
    assert resp.json()["total"] == 0


def test_resolving_notifies_reporter(client, register):
    reporter_token, _ = register(email="reporter2@example.com")
    reporter_headers = {"Authorization": f"Bearer {reporter_token}"}
    resolver_token, _ = register(email="resolver2@example.com")
    resolver_headers = {"Authorization": f"Bearer {resolver_token}"}

    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=reporter_headers).json()
    client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Fixed."},
        headers=resolver_headers,
    )

    resp = client.get("/api/notifications", headers=reporter_headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["type"] == "bug_resolved"


def test_resolving_own_bug_does_not_self_notify(client, register):
    token, _ = register(email="self2@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=headers).json()
    client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Fixed."},
        headers=headers,
    )
    resp = client.get("/api/notifications", headers=headers)
    assert resp.json()["total"] == 0


def test_critical_bug_notifies_admins_and_team_leads(client, register):
    admin_token, _ = register(email="admin-notif@example.com")  # bootstrap admin
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    lead_token, lead_user = register(email="lead-notif@example.com")
    lead_headers = {"Authorization": f"Bearer {lead_token}"}
    client.patch(f"/api/admin/users/{lead_user['id']}/role", json={"role": "Team Lead"}, headers=admin_headers)

    reporter_token, _ = register(email="reporter-notif@example.com")
    reporter_headers = {"Authorization": f"Bearer {reporter_token}"}

    client.post(
        "/api/bugs",
        json={"title": "Payment outage", "description": "Fatal error", "severity": "Critical"},
        headers=reporter_headers,
    )

    admin_notifs = client.get("/api/notifications", headers=admin_headers).json()
    lead_notifs = client.get("/api/notifications", headers=lead_headers).json()
    reporter_notifs = client.get("/api/notifications", headers=reporter_headers).json()

    assert admin_notifs["total"] == 1
    assert admin_notifs["items"][0]["type"] == "critical_bug"
    assert lead_notifs["total"] == 1
    assert reporter_notifs["total"] == 0  # reporter doesn't notify themselves


def test_non_critical_bug_does_not_notify(client, register):
    admin_token, _ = register(email="admin-notif2@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    client.post("/api/bugs", json={"title": "x", "description": "y", "severity": "Low"}, headers=admin_headers)
    resp = client.get("/api/notifications", headers=admin_headers)
    assert resp.json()["total"] == 0


def test_ai_analysis_notifies_reporter_and_assignee(client, register):
    reporter_token, _ = register(email="reporter3@example.com")
    reporter_headers = {"Authorization": f"Bearer {reporter_token}"}
    assignee_token, assignee_user = register(email="assignee3@example.com")
    assignee_headers = {"Authorization": f"Bearer {assignee_token}"}

    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=reporter_headers).json()
    client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": assignee_user["id"]}, headers=reporter_headers)
    client.post(f"/api/bugs/{bug['id']}/analyze", headers=reporter_headers)

    reporter_notifs = client.get("/api/notifications", headers=reporter_headers).json()
    assignee_notifs = client.get("/api/notifications", headers=assignee_headers).json()

    assert any(n["type"] == "ai_analysis_complete" for n in reporter_notifs["items"])
    assert any(n["type"] == "ai_analysis_complete" for n in assignee_notifs["items"])


def test_mark_notification_read(client, register):
    reporter_token, _ = register(email="reporter4@example.com")
    reporter_headers = {"Authorization": f"Bearer {reporter_token}"}
    assignee_token, assignee_user = register(email="assignee4@example.com")
    assignee_headers = {"Authorization": f"Bearer {assignee_token}"}

    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=reporter_headers).json()
    client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": assignee_user["id"]}, headers=reporter_headers)

    notif_id = client.get("/api/notifications", headers=assignee_headers).json()["items"][0]["id"]
    resp = client.patch(f"/api/notifications/{notif_id}/read", headers=assignee_headers)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    listing = client.get("/api/notifications", headers=assignee_headers).json()
    assert listing["unread_count"] == 0


def test_cannot_mark_others_notification_read(client, register):
    reporter_token, _ = register(email="reporter5@example.com")
    reporter_headers = {"Authorization": f"Bearer {reporter_token}"}
    assignee_token, assignee_user = register(email="assignee5@example.com")

    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=reporter_headers).json()
    client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": assignee_user["id"]}, headers=reporter_headers)

    notif_id = 1
    resp = client.patch(f"/api/notifications/{notif_id}/read", headers=reporter_headers)
    assert resp.status_code == 404


def test_mark_all_read(client, register):
    admin_token, _ = register(email="admin-notif3@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    reporter_token, _ = register(email="reporter6@example.com")
    reporter_headers = {"Authorization": f"Bearer {reporter_token}"}

    client.post(
        "/api/bugs",
        json={"title": "Critical one", "description": "y", "severity": "Critical"},
        headers=reporter_headers,
    )
    client.post(
        "/api/bugs",
        json={"title": "Critical two", "description": "y", "severity": "Critical"},
        headers=reporter_headers,
    )

    before = client.get("/api/notifications", headers=admin_headers).json()
    assert before["unread_count"] == 2

    resp = client.patch("/api/notifications/read-all", headers=admin_headers)
    assert resp.status_code == 204

    after = client.get("/api/notifications", headers=admin_headers).json()
    assert after["unread_count"] == 0
    assert after["total"] == 2
