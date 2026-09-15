def test_reports_generation_and_export(client, auth_headers):
    # 1. Create a bug
    client.post(
        "/api/bugs",
        json={"title": "Report generation test bug", "description": "Testing reports router"},
        headers=auth_headers,
    )

    # 2. Test generate report
    res = client.get("/api/reports/generate?report_type=weekly", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert data["summary"]["total_bugs"] >= 1
    assert len(data["items"]) >= 1

    # 3. Test export CSV
    csv_res = client.get("/api/reports/export-csv", headers=auth_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Report generation test bug" in csv_res.text
