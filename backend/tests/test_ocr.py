import io

from PIL import Image, ImageDraw, ImageFont

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def _create_bug(client, headers, **overrides):
    payload = {"title": "Some bug", "description": "Something broke."}
    payload.update(overrides)
    resp = client.post("/api/bugs", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _error_screenshot_bytes(lines) -> bytes:
    """Renders lines of text onto a white PNG using a cross-platform font."""
    font = None
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "arial.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "DejaVuSans.ttf",
    ]:
        try:
            font = ImageFont.truetype(candidate, 18)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    img = Image.new("RGB", (760, 30 + 30 * len(lines)), color="white")
    draw = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        draw.text((15, 15 + i * 30), line, fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_uploading_a_plain_log_file_has_no_extracted_text(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    resp = client.post(
        f"/api/bugs/{bug['id']}/attachments",
        files={"file": ("notes.txt", io.BytesIO(b"just some notes"), "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["extracted_text"] is None


def test_uploading_a_screenshot_extracts_real_text(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    image_bytes = _error_screenshot_bytes([
        "TypeError: Cannot read properties of null",
        "at Checkout.jsx:42:18",
    ])

    resp = client.post(
        f"/api/bugs/{bug['id']}/attachments",
        files={"file": ("error_screenshot.png", io.BytesIO(image_bytes), "image/png")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    extracted = resp.json()["extracted_text"]
    assert extracted is not None
    assert "TypeError" in extracted
    assert "Checkout" in extracted


def test_extracted_text_persists_on_bug_detail(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    image_bytes = _error_screenshot_bytes(["KeyError: 'user_id'"])
    client.post(
        f"/api/bugs/{bug['id']}/attachments",
        files={"file": ("err.png", io.BytesIO(image_bytes), "image/png")},
        headers=auth_headers,
    )

    detail = client.get(f"/api/bugs/{bug['id']}", headers=auth_headers).json()
    assert len(detail["attachments"]) == 1
    assert "KeyError" in detail["attachments"][0]["extracted_text"]


def test_blank_image_yields_no_extracted_text(client, auth_headers):
    bug = _create_bug(client, auth_headers)
    blank = Image.new("RGB", (200, 100), color="white")
    buf = io.BytesIO()
    blank.save(buf, format="PNG")

    resp = client.post(
        f"/api/bugs/{bug['id']}/attachments",
        files={"file": ("blank.png", io.BytesIO(buf.getvalue()), "image/png")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["extracted_text"] is None


def test_patch_stack_trace_from_ocr_text(client, auth_headers):
    """Simulates the frontend's 'Add to stack trace' button: PATCH the bug
    with the OCR'd text and confirm it's saved and logged on the timeline."""
    bug = _create_bug(client, auth_headers)
    ocr_text = "TypeError: Cannot read properties of null\nat Checkout.jsx:42:18"

    resp = client.patch(f"/api/bugs/{bug['id']}", json={"stack_trace": ocr_text}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["stack_trace"] == ocr_text

    detail = client.get(f"/api/bugs/{bug['id']}", headers=auth_headers).json()
    assert any(e["event_type"] == "stack_trace_updated" for e in detail["events"])


def test_ocr_extracted_text_feeds_log_analysis_once_applied(client, auth_headers):
    """End-to-end: upload a screenshot, apply its extracted text as the
    stack trace, then confirm the Log Analysis Agent actually parses it
    during a real AI analysis run — proving the OCR text is genuinely
    usable by the pipeline, not just stored inertly."""
    bug = _create_bug(client, auth_headers, title="Cart crash")
    image_bytes = _error_screenshot_bytes([
        "TypeError: Cannot read properties of null",
        "at Checkout.jsx:42:18",
    ])
    upload = client.post(
        f"/api/bugs/{bug['id']}/attachments",
        files={"file": ("err.png", io.BytesIO(image_bytes), "image/png")},
        headers=auth_headers,
    ).json()

    client.patch(f"/api/bugs/{bug['id']}", json={"stack_trace": upload["extracted_text"]}, headers=auth_headers)

    analysis = client.post(f"/api/bugs/{bug['id']}/analyze", headers=auth_headers).json()
    assert analysis["exception_type"] == "TypeError"
