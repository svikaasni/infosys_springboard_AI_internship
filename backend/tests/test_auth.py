def test_register_first_user_becomes_admin(client):
    """The very first account on a fresh install bootstraps as Admin — see
    the comment in routers/auth.py for why."""
    resp = client.post(
        "/api/auth/register",
        json={"full_name": "Alice Dev", "email": "alice@example.com", "password": "pass1234"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["role"] == "Admin"


def test_register_second_user_gets_default_role(client, register):
    register(email="first@example.com")  # bootstraps as Admin, consuming the "first user" slot
    resp = client.post(
        "/api/auth/register",
        json={"full_name": "Bob Dev", "email": "bob-second@example.com", "password": "pass1234"},
    )
    assert resp.status_code == 201
    assert resp.json()["user"]["role"] == "Developer"


def test_register_second_user_honors_requested_role(client, register):
    register(email="first2@example.com")
    resp = client.post(
        "/api/auth/register",
        json={
            "full_name": "Carol Lead",
            "email": "carol-second@example.com",
            "password": "pass1234",
            "role": "Team Lead",
        },
    )
    assert resp.json()["user"]["role"] == "Team Lead"


def test_register_second_user_cannot_self_register_as_admin(client, register):
    """Requesting role="Admin" at registration is silently downgraded for
    anyone but the bootstrap user — you cannot self-register your way into
    Admin. (This test caught a real privilege-escalation bug during
    development — the first version of this logic let it through.)"""
    register(email="first3@example.com")
    resp = client.post(
        "/api/auth/register",
        json={
            "full_name": "Eve Attacker",
            "email": "eve@example.com",
            "password": "pass1234",
            "role": "Admin",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["user"]["role"] == "Developer"


def test_register_duplicate_email_fails(client, register):
    register(email="dupe@example.com")
    resp = client.post(
        "/api/auth/register",
        json={"full_name": "Someone Else", "email": "dupe@example.com", "password": "pass1234"},
    )
    assert resp.status_code == 400


def test_login_success(client, register):
    register(email="bob@example.com", password="pass1234")
    resp = client.post("/api/auth/login", json={"email": "bob@example.com", "password": "pass1234"})
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password_fails(client, register):
    register(email="carol@example.com", password="pass1234")
    resp = client.post("/api/auth/login", json={"email": "carol@example.com", "password": "wrongpass"})
    assert resp.status_code == 401


def test_login_unknown_email_fails(client):
    resp = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "pass1234"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


def test_update_me_changes_name_and_role(client, register):
    # Use a second-registered (non-bootstrap-Admin) user, since Admins are
    # now blocked from self-demoting via this endpoint (see the test below).
    register(email="first-bootstrap@example.com")
    token, _ = register(email="second-user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.put(
        "/api/auth/me",
        json={"full_name": "Updated Name", "role": "Team Lead"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["full_name"] == "Updated Name"
    assert body["role"] == "Team Lead"


def test_admin_cannot_self_demote_via_update_me(client, auth_headers):
    resp = client.put("/api/auth/me", json={"role": "Developer"}, headers=auth_headers)
    assert resp.status_code == 400


def test_non_admin_cannot_self_promote_via_update_me(client, register):
    register(email="bootstrap-admin@example.com")
    token, _ = register(email="regular-user@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.put("/api/auth/me", json={"role": "Admin"}, headers=headers)
    assert resp.status_code == 403


def test_update_me_password_allows_relogin(client, register):
    token, _ = register(email="dave@example.com", password="oldpass123")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.put("/api/auth/me", json={"password": "newpass456"}, headers=headers)
    assert resp.status_code == 200

    old_login = client.post("/api/auth/login", json={"email": "dave@example.com", "password": "oldpass123"})
    assert old_login.status_code == 401

    new_login = client.post("/api/auth/login", json={"email": "dave@example.com", "password": "newpass456"})
    assert new_login.status_code == 200
