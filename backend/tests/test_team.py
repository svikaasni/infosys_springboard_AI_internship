def test_team_flow(client, auth_headers):
    # 1. List initial members
    res = client.get("/api/team/members", headers=auth_headers)
    assert res.status_code == 200
    initial_members = res.json()
    assert len(initial_members) >= 1

    # 2. Invite a new team member
    invite_payload = {
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "role": "QA Engineer",
        "message": "Welcome to our testing team!",
    }
    invite_res = client.post("/api/team/invite", json=invite_payload, headers=auth_headers)
    assert invite_res.status_code == 201
    data = invite_res.json()
    assert data["success"] is True
    assert data["member"]["name"] == "Jane Doe"
    assert data["member"]["role"] == "QA Engineer"
    new_member_id = data["member"]["id"]

    # 3. List invitations
    inv_res = client.get("/api/team/invitations", headers=auth_headers)
    assert inv_res.status_code == 200
    invitations = inv_res.json()
    assert any(inv["email"] == "jane.doe@example.com" for inv in invitations)

    # 4. Update member role
    role_res = client.patch(
        f"/api/team/members/{new_member_id}/role",
        json={"role": "Team Lead"},
        headers=auth_headers,
    )
    assert role_res.status_code == 200
    assert role_res.json()["member"]["role"] == "Team Lead"

    # 5. Remove member
    del_res = client.delete(f"/api/team/members/{new_member_id}", headers=auth_headers)
    assert del_res.status_code == 200
