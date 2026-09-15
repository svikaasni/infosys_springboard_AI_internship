def test_global_search_flow(client, auth_headers):
    # 1. Create a bug with distinctive terms
    client.post(
        "/api/bugs",
        json={"title": "Payment gateway timeout on checkout", "description": "Stripe API threw 504"},
        headers=auth_headers,
    )

    # 2. Search for keyword
    res = client.get("/api/search?q=Stripe", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any("Payment gateway timeout" in r["title"] for r in data["results"])

    # 3. Search with empty string
    empty_res = client.get("/api/search?q=", headers=auth_headers)
    assert empty_res.status_code == 200
    assert empty_res.json()["total"] == 0
