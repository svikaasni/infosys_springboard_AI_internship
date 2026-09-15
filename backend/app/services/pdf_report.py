"""
PDF Report generation
------------------------
Builds a downloadable PDF summary of a single bug: its core details, the
stored AI analysis (if one has been run), and its resolution. Pure
reportlab — no system dependencies (no wkhtmltopdf/cairo/pango), so this
works the same in the Docker image as it does locally.

If the bug hasn't been analyzed yet, the AI Analysis section says so
plainly rather than being silently omitted, so the report is honest about
what it does and doesn't contain.
"""
import io
import json
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, ListFlowable, ListItem,
)

from app import models

SEVERITY_COLORS = {
    "Critical": colors.HexColor("#c0392b"),
    "High": colors.HexColor("#d68910"),
    "Medium": colors.HexColor("#2874a6"),
    "Low": colors.HexColor("#707b7c"),
}


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        "ReportTitle", parent=styles["Title"], fontSize=18, spaceAfter=4, textColor=colors.HexColor("#111827"),
    ))
    styles.add(ParagraphStyle(
        "SectionHeading", parent=styles["Heading2"], fontSize=13, spaceBefore=14, spaceAfter=6,
        textColor=colors.HexColor("#111827"),
    ))
    styles.add(ParagraphStyle(
        "SubHeading", parent=styles["Heading3"], fontSize=10.5, spaceBefore=8, spaceAfter=3,
        textColor=colors.HexColor("#374151"),
    ))
    styles.add(ParagraphStyle(
        "Body", parent=styles["BodyText"], fontSize=9.5, leading=14, textColor=colors.HexColor("#1f2937"),
    ))
    styles.add(ParagraphStyle(
        "Mono", parent=styles["Code"], fontSize=8, leading=11, backColor=colors.HexColor("#f3f4f6"),
        borderPadding=6, textColor=colors.HexColor("#111827"),
    ))
    styles.add(ParagraphStyle(
        "Meta", parent=styles["BodyText"], fontSize=9, textColor=colors.HexColor("#6b7280"),
    ))
    return styles


def _meta_table(rows, styles):
    data = [[Paragraph(f"<b>{label}</b>", styles["Meta"]), Paragraph(str(value), styles["Body"])] for label, value in rows]
    table = Table(data, colWidths=[1.4 * inch, 4.6 * inch])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def generate_bug_report_pdf(bug: models.Bug) -> bytes:
    styles = _styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch, topMargin=0.75 * inch, bottomMargin=0.75 * inch,
        title=f"Bug Report #{bug.id}", author="Intelligent Bug Diagnosis Platform with Fix Recommendation Assistance",
    )

    elements = []

    elements.append(Paragraph(f"Bug Report #{bug.id}", styles["ReportTitle"]))
    elements.append(Paragraph(bug.title, styles["Heading2"]))
    elements.append(Spacer(1, 6))

    severity_val = bug.severity.value if hasattr(bug.severity, "value") else bug.severity
    priority_val = bug.priority.value if hasattr(bug.priority, "value") else bug.priority
    status_val = bug.status.value if hasattr(bug.status, "value") else bug.status

    elements.append(_meta_table([
        ("Severity", severity_val),
        ("Priority", priority_val),
        ("Status", status_val),
        ("Category", bug.category or "Uncategorized"),
        ("Project / Module", f"{bug.project or '—'} / {bug.module or '—'}"),
        ("Reported by", f"{bug.reporter.full_name} ({bug.reporter.email})"),
        ("Assigned to", bug.assignee.full_name if bug.assignee else "Unassigned"),
        ("Created", bug.created_at.strftime("%Y-%m-%d %H:%M UTC") if bug.created_at else "—"),
        ("Resolved", bug.resolved_at.strftime("%Y-%m-%d %H:%M UTC") if bug.resolved_at else "—"),
    ], styles))

    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#e5e7eb"), spaceBefore=10, spaceAfter=10))

    elements.append(Paragraph("Description", styles["SectionHeading"]))
    elements.append(Paragraph(bug.description.replace("\n", "<br/>"), styles["Body"]))

    if bug.stack_trace:
        elements.append(Paragraph("Stack Trace / Error Log", styles["SectionHeading"]))
        escaped = (
            bug.stack_trace.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
        )
        elements.append(Paragraph(escaped, styles["Mono"]))

    # ---------- AI Analysis ----------
    elements.append(Paragraph("AI Multi-Agent Analysis", styles["SectionHeading"]))
    analysis = bug.analysis
    if not analysis:
        elements.append(Paragraph(
            "This bug has not been analyzed yet. Run the AI pipeline from the Bug Details page to populate "
            "this section (triage prediction, log analysis, similar bugs, root cause, and a suggested fix).",
            styles["Body"],
        ))
    else:
        elements.append(Paragraph("Triage", styles["SubHeading"]))
        elements.append(Paragraph(
            f"Predicted severity: <b>{analysis.predicted_severity.value if hasattr(analysis.predicted_severity, 'value') else analysis.predicted_severity}</b> · "
            f"Priority: <b>{analysis.predicted_priority.value if hasattr(analysis.predicted_priority, 'value') else analysis.predicted_priority}</b> · "
            f"Category: <b>{analysis.predicted_category}</b> · Confidence: {analysis.triage_confidence}%",
            styles["Body"],
        ))
        if analysis.triage_reasoning:
            elements.append(Paragraph(analysis.triage_reasoning, styles["Body"]))

        if analysis.exception_type:
            elements.append(Paragraph("Log Analysis", styles["SubHeading"]))
            location = f"{analysis.failure_file}:{analysis.failure_line}" if analysis.failure_file else "unknown location"
            elements.append(Paragraph(
                f"Exception: <b>{analysis.exception_type}</b> at {location}"
                f"{f' in {analysis.failure_function}()' if analysis.failure_function else ''}.",
                styles["Body"],
            ))
            if analysis.log_summary:
                elements.append(Paragraph(analysis.log_summary, styles["Body"]))

        duplicates = json.loads(analysis.duplicates_json) if analysis.duplicates_json else []
        if duplicates:
            elements.append(Paragraph("Similar Bugs (Duplicate Detection)", styles["SubHeading"]))
            items = [
                ListItem(Paragraph(
                    f"#{d['bug_id']} — {d['title']} ({d['similarity']:.0f}% similar, {d['status']})",
                    styles["Body"],
                ))
                for d in duplicates
            ]
            elements.append(ListFlowable(items, bulletType="bullet", leftIndent=14))

        if analysis.root_cause_text:
            elements.append(Paragraph("Root Cause", styles["SubHeading"]))
            elements.append(Paragraph(
                f"Confidence: {analysis.root_cause_confidence}%", styles["Meta"],
            ))
            elements.append(Paragraph(analysis.root_cause_text.replace("\n", "<br/>"), styles["Body"]))

        if analysis.suggested_fix:
            elements.append(Paragraph("Recommended Fix", styles["SubHeading"]))
            elements.append(Paragraph(
                f"Estimated fix time: {analysis.estimated_fix_time}", styles["Meta"],
            ))
            elements.append(Paragraph(analysis.suggested_fix, styles["Body"]))

            best_practices = json.loads(analysis.best_practices) if analysis.best_practices else []
            if best_practices:
                elements.append(Paragraph("Best practices:", styles["Body"]))
                elements.append(ListFlowable(
                    [ListItem(Paragraph(bp, styles["Body"])) for bp in best_practices],
                    bulletType="bullet", leftIndent=14,
                ))

    # ---------- Resolution ----------
    if bug.resolution_notes:
        elements.append(Paragraph("Resolution", styles["SectionHeading"]))
        elements.append(Paragraph(bug.resolution_notes.replace("\n", "<br/>"), styles["Body"]))

    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        f"Generated by Intelligent Bug Diagnosis Platform with Fix Recommendation Assistance on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["Meta"],
    ))

    doc.build(elements)
    return buffer.getvalue()
