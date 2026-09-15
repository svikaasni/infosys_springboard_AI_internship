def test_vector_store_and_duplicate_check(client, auth_headers):
    # 1. Create a resolved bug
    res = client.post(
        "/api/bugs/manual-resolved",
        json={
            "title": "Database connection pool exhaustion",
            "description": "SQLAlchemy pool ran out of connections under load.",
            "category": "Backend",
            "language": "Python",
            "root_cause": "Unclosed sessions in background tasks.",
            "fix_recommendation": "Use context manager with get_db to guarantee session close.",
        },
        headers=auth_headers,
    )
    assert res.status_code == 201

    # 2. Check vector stats
    stats_res = client.get("/api/knowledge-base/vector-stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_vectors" in stats
    assert stats["dimension"] == 384

    # 3. Test duplicate check endpoint
    dup_res = client.post(
        "/api/bugs/duplicate-check",
        json={"text": "Database pool connections exhausted during peak traffic"},
        headers=auth_headers,
    )
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert "is_likely_duplicate" in dup_data
    assert "similar_bugs" in dup_data
    assert dup_data["highest_similarity"] > 0
    assert any("Database connection pool" in b["title"] for b in dup_data["similar_bugs"])
