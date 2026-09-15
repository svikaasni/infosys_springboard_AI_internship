def test_first_user_can_access_admin_endpoints(client, register):
    token, admin_user = register(email="admin1@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_non_admin_cannot_access_admin_endpoints(client, register):
    register(email="admin2@example.com")  # bootstrap admin, consumes first-user slot
    token, _ = register(email="regular@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 403


def test_admin_endpoints_require_auth(client):
    resp = client.get("/api/admin/users")
    assert resp.status_code == 401


def test_admin_can_list_users_with_bug_counts(client, register):
    admin_token, admin_user = register(email="admin3@example.com", full_name="Admin One")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=admin_headers)

    resp = client.get("/api/admin/users", headers=admin_headers)
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["bugs_reported"] == 1
    assert body["items"][0]["role"] == "Admin"


def test_admin_can_promote_another_user(client, register):
    admin_token, _ = register(email="admin4@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    _, dev_user = register(email="dev1@example.com")

    resp = client.patch(
        f"/api/admin/users/{dev_user['id']}/role",
        json={"role": "Team Lead"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "Team Lead"


def test_admin_cannot_demote_self(client, register):
    admin_token, admin_user = register(email="admin5@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.patch(
        f"/api/admin/users/{admin_user['id']}/role",
        json={"role": "Developer"},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_non_admin_cannot_promote_users(client, register):
    register(email="admin6@example.com")
    dev_token, dev_user = register(email="dev2@example.com")
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    resp = client.patch(
        f"/api/admin/users/{dev_user['id']}/role",
        json={"role": "Admin"},
        headers=dev_headers,
    )
    assert resp.status_code == 403


def test_update_role_rejects_invalid_role(client, register):
    admin_token, _ = register(email="admin7@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    _, dev_user = register(email="dev3@example.com")

    resp = client.patch(
        f"/api/admin/users/{dev_user['id']}/role",
        json={"role": "Superuser"},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_admin_can_delete_another_user(client, register):
    admin_token, _ = register(email="admin8@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    _, dev_user = register(email="dev4@example.com")

    resp = client.delete(f"/api/admin/users/{dev_user['id']}", headers=admin_headers)
    assert resp.status_code == 204

    listing = client.get("/api/admin/users", headers=admin_headers).json()
    assert listing["total"] == 1


def test_admin_cannot_delete_self(client, register):
    admin_token, admin_user = register(email="admin9@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.delete(f"/api/admin/users/{admin_user['id']}", headers=admin_headers)
    assert resp.status_code == 400


def test_deleting_user_unassigns_their_bugs_but_keeps_bug(client, register):
    admin_token, _ = register(email="admin10@example.com")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    dev_token, dev_user = register(email="dev5@example.com")
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    bug = client.post("/api/bugs", json={"title": "x", "description": "y"}, headers=admin_headers).json()
    client.patch(f"/api/bugs/{bug['id']}/assign", json={"assignee_id": dev_user["id"]}, headers=admin_headers)

    client.delete(f"/api/admin/users/{dev_user['id']}", headers=admin_headers)

    detail = client.get(f"/api/bugs/{bug['id']}", headers=admin_headers).json()
    assert detail["assignee"] is None
