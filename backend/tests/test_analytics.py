def _create_bug(client, headers, **overrides):
    payload = {
        "title": "Sample bug",
        "description": "Something went wrong.",
        "severity": "Medium",
        "priority": "P2",
    }
    payload.update(overrides)
    resp = client.post("/api/bugs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_health_score_is_100_for_empty_db(client, auth_headers):
    resp = client.get("/api/analytics/health-score", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["score"] == 100
    assert body["status"] == "Excellent"


def test_health_score_penalizes_open_critical_bugs(client, auth_headers):
    _create_bug(client, auth_headers, title="Payment gateway down", severity="Critical", priority="P0")
    resp = client.get("/api/analytics/health-score", headers=auth_headers)
    body = resp.json()
    assert body["score"] < 100
    assert body["critical_open_bugs"] == 1


def test_health_score_improves_after_resolution(client, auth_headers):
    bug = _create_bug(client, auth_headers, severity="Critical")
    score_before = client.get("/api/analytics/health-score", headers=auth_headers).json()["score"]

    client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Fixed."},
        headers=auth_headers,
    )
    score_after = client.get("/api/analytics/health-score", headers=auth_headers).json()["score"]

    assert score_after > score_before


def test_analytics_summary_counts(client, auth_headers):
    _create_bug(client, auth_headers, severity="Critical")
    _create_bug(client, auth_headers, severity="Low")
    resp = client.get("/api/analytics/summary", headers=auth_headers)
    body = resp.json()
    assert body["total_bugs"] == 2
    assert body["critical_bugs"] == 1


def test_team_performance_counts_resolved_by_reporter(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Fixed."},
        headers=auth_headers,
    )

    resp = client.get("/api/analytics/team-performance", headers=auth_headers)
    body = resp.json()
    assert len(body) == 1
    assert body[0]["label"] == "Test User"
    assert body[0]["count"] == 1


def test_team_performance_prefers_assignee_over_reporter(client, register):
    token1, _ = register(email="reporter2@example.com", full_name="Reporter Two")
    token2, user2 = register(email="assignee2@example.com", full_name="Assignee Two")
    headers1 = {"Authorization": f"Bearer {token1}"}

    bug = _create_bug(client, headers1)
    client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": user2["id"]}, headers=headers1)
    client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Fixed."},
        headers=headers1,
    )

    resp = client.get("/api/analytics/team-performance", headers=headers1)
    body = resp.json()
    labels = [item["label"] for item in body]
    assert "Assignee Two" in labels
    assert "Reporter Two" not in labels
