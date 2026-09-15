"""
OCR service
-------------
Extracts text from an uploaded image attachment (a screenshot of an error
dialog, for example) so it can be offered to the person as a starting point
for the bug's stack trace field — the AI agents only ever read the
title/description/stack_trace text fields, never attachment files directly,
so this is the bridge between "I have a screenshot" and "the AI can analyze
this."

Requires the Tesseract OCR binary to be installed on the machine running the
backend (see README for install instructions per OS). This is checked once
per process and the feature degrades gracefully — not fatally — if it's
missing: extract_text_from_image() returns None, the upload still succeeds,
and the frontend simply doesn't show a "text found" prompt for that image.
"""
import io
from typing import Optional

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}

_tesseract_checked = False
_tesseract_available = False


def _check_tesseract_available() -> bool:
    global _tesseract_checked, _tesseract_available
    if not _tesseract_checked:
        _tesseract_checked = True
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            _tesseract_available = True
        except Exception:
            # Binary not installed, not on PATH, or any other OCR-environment
            # issue — treat OCR as simply unavailable rather than an error.
            _tesseract_available = False
    return _tesseract_available


def is_image_filename(filename: str) -> bool:
    lower = filename.lower()
    return any(lower.endswith(ext) for ext in IMAGE_EXTENSIONS)


def extract_text_from_image(image_bytes: bytes) -> Optional[str]:
    if not _check_tesseract_available():
        return None

    try:
        import pytesseract
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        text = text.strip()
        return text if text else None
    except Exception:
        # Corrupt image, unsupported format PIL can't open, etc. — don't
        # fail the upload over a failed OCR attempt.
        return None
