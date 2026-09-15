import datetime
import enum

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum, Boolean
)
from sqlalchemy.orm import relationship

from app.database import Base


class SeverityEnum(str, enum.Enum):
    critical = "Critical"
    high = "High"
    medium = "Medium"
    low = "Low"


class PriorityEnum(str, enum.Enum):
    p0 = "P0"
    p1 = "P1"
    p2 = "P2"
    p3 = "P3"


class StatusEnum(str, enum.Enum):
    open = "Open"
    in_progress = "In Progress"
    resolved = "Resolved"
    closed = "Closed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="Developer")
    organization = Column(String(120), nullable=True, default="TechCorp Solutions")
    status = Column(String(30), default="Active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bugs = relationship(
        "Bug",
        back_populates="reporter",
        foreign_keys="Bug.reporter_id",
        cascade="all, delete-orphan",
    )


class Bug(Base):
    __tablename__ = "bugs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    module = Column(String(120), nullable=True)
    project = Column(String(120), nullable=True)

    # Programming language / technology this defect belongs to (e.g. "Python",
    # "JavaScript / Node.js"), and free-text comma-separated tags. Ported from
    # the "Add Past Defect" feature so historical defects can be searched and
    # filtered by tech stack in the Knowledge Base.
    language = Column(String(80), nullable=True)
    tags = Column(String(255), nullable=True)

    severity = Column(
        SAEnum(SeverityEnum),
        default=SeverityEnum.medium,
        nullable=False,
    )
    priority = Column(
        SAEnum(PriorityEnum),
        default=PriorityEnum.p2,
        nullable=False,
    )
    status = Column(
        SAEnum(StatusEnum),
        default=StatusEnum.open,
        nullable=False,
    )

    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    reporter_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    reporter = relationship(
        "User",
        back_populates="bugs",
        foreign_keys=[reporter_id],
    )

    assignee_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )
    assignee = relationship(
        "User",
        foreign_keys=[assignee_id],
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    comments = relationship(
        "Comment",
        back_populates="bug",
        cascade="all, delete-orphan",
        order_by="Comment.created_at",
    )
    attachments = relationship(
        "Attachment",
        back_populates="bug",
        cascade="all, delete-orphan",
    )
    events = relationship(
        "BugEvent",
        back_populates="bug",
        cascade="all, delete-orphan",
        order_by="BugEvent.created_at",
    )
    analysis = relationship(
        "BugAnalysis",
        back_populates="bug",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(
        Integer,
        ForeignKey("bugs.id"),
        nullable=False,
    )
    author_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    body = Column(Text, nullable=False)
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    bug = relationship(
        "Bug",
        back_populates="comments",
    )
    author = relationship("User")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(
        Integer,
        ForeignKey("bugs.id"),
        nullable=False,
    )
    filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    content_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, default=0)
    uploaded_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    # Populated for image attachments when Tesseract OCR is available.
    extracted_text = Column(Text, nullable=True)

    bug = relationship(
        "Bug",
        back_populates="attachments",
    )
    uploaded_by = relationship("User")


class BugEvent(Base):
    """Timeline entries: created, status changes, comments, AI analysis runs."""

    __tablename__ = "bug_events"

    id = Column(Integer, primary_key=True, index=True)
    bug_id = Column(
        Integer,
        ForeignKey("bugs.id"),
        nullable=False,
    )
    event_type = Column(String(50), nullable=False)
    detail = Column(String(500), nullable=True)
    actor_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )
    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    bug = relationship(
        "Bug",
        back_populates="events",
    )
    actor = relationship("User")


class BugAnalysis(Base):
    """
    Stores the latest AI multi-agent pipeline result for a bug (1:1).

    Includes:
    - Triage
    - Log analysis
    - Duplicate detection
    - Root cause analysis
    - Remediation
    - AI Risk Score
    """

    __tablename__ = "bug_analyses"

    id = Column(Integer, primary_key=True, index=True)

    bug_id = Column(
        Integer,
        ForeignKey("bugs.id"),
        unique=True,
        nullable=False,
    )

    # -------------------------------------------------------
    # Triage Agent
    # -------------------------------------------------------

    predicted_severity = Column(
        SAEnum(SeverityEnum),
        nullable=True,
    )

    predicted_priority = Column(
        SAEnum(PriorityEnum),
        nullable=True,
    )

    predicted_category = Column(
        String(100),
        nullable=True,
    )

    triage_confidence = Column(
        Integer,
        default=0,
    )

    triage_reasoning = Column(
        Text,
        nullable=True,
    )

    # -------------------------------------------------------
    # Log Analysis Agent
    # -------------------------------------------------------

    exception_type = Column(
        String(200),
        nullable=True,
    )

    failure_file = Column(
        String(300),
        nullable=True,
    )

    failure_line = Column(
        String(20),
        nullable=True,
    )

    failure_function = Column(
        String(200),
        nullable=True,
    )

    log_summary = Column(
        Text,
        nullable=True,
    )

    # -------------------------------------------------------
    # Duplicate Detection Agent
    # -------------------------------------------------------

    duplicates_json = Column(
        Text,
        nullable=True,
    )

    # -------------------------------------------------------
    # Root Cause Agent
    # -------------------------------------------------------

    root_cause_text = Column(
        Text,
        nullable=True,
    )

    root_cause_confidence = Column(
        Integer,
        default=0,
    )

    grounded_on_json = Column(
        Text,
        nullable=True,
    )

    # -------------------------------------------------------
    # Remediation Agent
    # -------------------------------------------------------

    suggested_fix = Column(
        Text,
        nullable=True,
    )

    best_practices = Column(
        Text,
        nullable=True,
    )

    prevention_tips = Column(
        Text,
        nullable=True,
    )

    estimated_fix_time = Column(
        String(50),
        nullable=True,
    )

    # -------------------------------------------------------
    # AI Risk Score
    # -------------------------------------------------------

    risk_score = Column(
        Integer,
        default=0,
        nullable=False,
    )

    risk_level = Column(
        String(30),
        default="Minimal",
        nullable=False,
    )

    risk_summary = Column(
        Text,
        nullable=True,
    )

    # JSON-encoded list containing the score explanation.
    #
    # Example:
    # [
    #   {
    #       "label": "Severity",
    #       "points": 35,
    #       "detail": "Bug severity is critical."
    #   }
    # ]
    risk_factors_json = Column(
        Text,
        nullable=True,
    )

    # -------------------------------------------------------
    # Interactive Code Fix & Telemetry (Novel Integration)
    # -------------------------------------------------------

    code_diff = Column(
        Text,
        nullable=True,
    )

    ai_thinking_steps = Column(
        Text,
        nullable=True,
    )

    tokens_used = Column(
        Integer,
        default=0,
    )

    ai_model = Column(
        String(50),
        default="Nexus-Pro",
    )

    temp_settings = Column(
        Text,
        default="{}",
    )

    chat_history = Column(
        Text,
        default="[]",
    )

    # -------------------------------------------------------
    # Timestamps
    # -------------------------------------------------------

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    bug = relationship(
        "Bug",
        back_populates="analysis",
    )


class NotificationType(str, enum.Enum):
    bug_assigned = "bug_assigned"
    bug_resolved = "bug_resolved"
    critical_bug = "critical_bug"
    ai_analysis_complete = "ai_analysis_complete"


class Notification(Base):
    """
    In-app notification only.

    The frontend polls GET /api/notifications and displays
    the resulting notifications.
    """

    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    type = Column(
        SAEnum(NotificationType),
        nullable=False,
    )

    message = Column(
        String(500),
        nullable=False,
    )

    related_bug_id = Column(
        Integer,
        ForeignKey("bugs.id"),
        nullable=True,
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
    )

    related_bug = relationship(
        "Bug",
        foreign_keys=[related_bug_id],
    )


class TeamInvitation(Base):
    __tablename__ = "team_invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(180), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="Developer")
    message = Column(Text, nullable=True)
    token = Column(String(100), unique=True, index=True, nullable=False)
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(30), default="Pending")  # Pending, Accepted, Canceled, Expired
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    invited_by = relationship("User", foreign_keys=[invited_by_id])


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(180), nullable=False, index=True)
    token = Column(String(100), unique=True, index=True, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)