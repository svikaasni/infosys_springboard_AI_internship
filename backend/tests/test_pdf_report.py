import io
from pypdf import PdfReader


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


def _extract_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() for page in reader.pages)


def test_report_requires_auth(client):
    resp = client.get("/api/bugs/1/report")
    assert resp.status_code == 401


def test_report_404_for_missing_bug(client, auth_headers):
    resp = client.get("/api/bugs/999999/report", headers=auth_headers)
    assert resp.status_code == 404


def test_report_is_valid_pdf_with_bug_details(client, auth_headers):
    bug = _create_bug(client, auth_headers, title="Unique Report Title XYZ")
    resp = client.get(f"/api/bugs/{bug['id']}/report", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert f'bug_{bug["id"]}_report.pdf' in resp.headers["content-disposition"]
    assert resp.content[:4] == b"%PDF"

    text = _extract_text(resp.content)
    assert "Unique Report Title XYZ" in text
    assert "High" in text  # severity
    assert "Cannot read properties of null" in text  # stack trace


def test_report_without_analysis_says_so(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.get(f"/api/bugs/{bug['id']}/report", headers=auth_headers)
    text = _extract_text(resp.content)
    assert "has not been analyzed yet" in text


def test_report_includes_ai_analysis_after_running_it(client, auth_headers):
    bug1 = _create_bug(client, auth_headers, title="Null pointer on checkout")
    client.patch(
        f"/api/bugs/{bug1['id']}",
        json={"status": "Resolved", "resolution_notes": "Added a null check for cart.items."},
        headers=auth_headers,
    )
    bug2 = _create_bug(client, auth_headers, title="Cart crashes when empty")
    client.post(f"/api/bugs/{bug2['id']}/analyze", headers=auth_headers)

    resp = client.get(f"/api/bugs/{bug2['id']}/report", headers=auth_headers)
    text = _extract_text(resp.content)

    assert "AI Multi-Agent Analysis" in text
    assert "Triage" in text
    assert "Root Cause" in text
    assert "Recommended Fix" in text
    assert "null check" in text  # grounded in bug1's actual resolution notes


def test_report_includes_resolution_notes(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    client.patch(
        f"/api/bugs/{bug['id']}",
        json={"status": "Resolved", "resolution_notes": "Fixed by patching the null check."},
        headers=auth_headers,
    )
    resp = client.get(f"/api/bugs/{bug['id']}/report", headers=auth_headers)
    text = _extract_text(resp.content)
    assert "Resolution" in text
    assert "Fixed by patching the null check." in text


def test_report_handles_bug_with_no_stack_trace(client, auth_headers):
    bug = _create_bug(client, auth_headers, stack_trace=None)
    resp = client.get(f"/api/bugs/{bug['id']}/report", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.content[:4] == b"%PDF"
