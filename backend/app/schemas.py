import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, EmailStr, ConfigDict

from app.models import SeverityEnum, PriorityEnum, StatusEnum


# ---------- Auth / Users ----------

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Optional[str] = "Developer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    organization: Optional[str] = "TechCorp Solutions"
    status: Optional[str] = "Active"
    created_at: datetime.datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Bugs ----------

class BugCreate(BaseModel):
    title: str
    description: str
    stack_trace: Optional[str] = None
    category: Optional[str] = None
    module: Optional[str] = None
    project: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[str] = None
    severity: SeverityEnum = SeverityEnum.medium
    priority: PriorityEnum = PriorityEnum.p2


class BugUpdate(BaseModel):
    status: Optional[StatusEnum] = None
    severity: Optional[SeverityEnum] = None
    priority: Optional[PriorityEnum] = None
    resolution_notes: Optional[str] = None
    stack_trace: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[str] = None


class ReporterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr


class BugOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    stack_trace: Optional[str]
    category: Optional[str]
    module: Optional[str] = None
    project: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[str] = None
    severity: SeverityEnum
    priority: PriorityEnum
    status: StatusEnum
    resolution_notes: Optional[str]
    resolved_at: Optional[datetime.datetime] = None
    reporter: ReporterOut
    assignee: Optional[ReporterOut] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class BugAssign(BaseModel):
    assignee_id: Optional[int] = None


class BugListResponse(BaseModel):
    total: int
    items: List[BugOut]


# ---------- Comments / Attachments / Timeline ----------

class CommentCreate(BaseModel):
    body: str


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    author: ReporterOut
    created_at: datetime.datetime


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    content_type: Optional[str]
    size_bytes: int
    extracted_text: Optional[str] = None
    created_at: datetime.datetime


class BugEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    detail: Optional[str]
    actor: Optional[ReporterOut] = None
    created_at: datetime.datetime


# ---------- AI Analysis ----------

class DuplicateMatchOut(BaseModel):
    bug_id: int
    title: str
    similarity: float
    status: str
    resolution_notes: Optional[str] = None


class RiskFactorOut(BaseModel):
    label: str
    points: int
    detail: str


class BugAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    # Triage Agent
    predicted_severity: Optional[SeverityEnum]
    predicted_priority: Optional[PriorityEnum]
    predicted_category: Optional[str]
    triage_confidence: int
    triage_reasoning: Optional[str] = None

    # Log Analysis Agent
    exception_type: Optional[str]
    failure_file: Optional[str]
    failure_line: Optional[str]
    failure_function: Optional[str]
    log_summary: Optional[str]

    # Duplicate Detection Agent
    duplicates: List[DuplicateMatchOut] = []

    # Root Cause Agent
    root_cause_text: Optional[str]
    root_cause_confidence: int

    # Remediation Agent
    suggested_fix: Optional[str]
    best_practices: List[str] = []
    prevention_tips: List[str] = []
    estimated_fix_time: Optional[str]

    # AI Risk Score
    risk_score: int = 0
    risk_level: str = "Minimal"
    risk_summary: Optional[str] = None
    risk_factors: List[RiskFactorOut] = []

    # Interactive Code Fix & Telemetry (Novel Integration)
    code_diff: Optional[Dict[str, Any]] = None
    ai_thinking_steps: List[Dict[str, Any]] = []
    tokens_used: int = 0
    ai_model: Optional[str] = "Nexus-Pro"
    temp_settings: Optional[Dict[str, Any]] = None
    chat_history: List[Dict[str, Any]] = []

    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------- Novel Integration Schemas ----------

class TuningParameters(BaseModel):
    ai_model: Optional[str] = "Nexus-Pro"
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    deep_reasoning: Optional[bool] = True


class DryRunRequest(BaseModel):
    title: str
    description: str
    stack_trace: Optional[str] = ""
    category: Optional[str] = None
    ai_model: Optional[str] = "Nexus-Pro"
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    deep_reasoning: Optional[bool] = True


class DryRunResponse(BaseModel):
    triage: Dict[str, Any] = {}
    log_analysis: Dict[str, Any] = {}
    duplicates: List[Dict[str, Any]] = []
    root_cause: Dict[str, Any] = {}
    remediation: Dict[str, Any] = {}
    risk_score: Dict[str, Any] = {}
    code_diff: Optional[Dict[str, Any]] = None
    ai_thinking_steps: List[Dict[str, Any]] = []
    tokens_used: int = 0
    ai_model: str = "Nexus-Pro"
    temp_settings: Dict[str, Any] = {}
    confidence: int = 85

    predicted_severity: Optional[str] = None
    predicted_category: Optional[str] = None
    confidence_score: Optional[float] = None
    root_cause_hypothesis: Optional[str] = None
    recommended_patch: Optional[str] = None
    thinking_steps: List[str] = []
    telemetry: Optional[Dict[str, Any]] = None


class BugChatRequest(BaseModel):
    message: str


class BugChatResponse(BaseModel):
    reply: str
    chat_history: List[Dict[str, Any]] = []
    history: List[Dict[str, Any]] = []


class VerifyResponse(BaseModel):
    success: bool
    verified: bool = True
    logs: List[str] = []
    status: str = "Resolved"
    bug_status: str = "Resolved"


class BugDetailOut(BugOut):
    comments: List[CommentOut] = []
    attachments: List[AttachmentOut] = []
    events: List[BugEventOut] = []
    analysis: Optional[BugAnalysisOut] = None


# ---------- Knowledge Base ----------

class KnowledgeBaseEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: Optional[str]
    module: Optional[str] = None
    project: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[str] = None
    severity: SeverityEnum
    resolution_notes: str
    resolved_at: Optional[datetime.datetime]
    reporter: ReporterOut


class KnowledgeBaseResponse(BaseModel):
    total: int
    items: List[KnowledgeBaseEntryOut]


class ManualDefectCreate(BaseModel):
    """
    Ported from the "Add Past Defect" feature: lets a user register a
    defect that was already resolved before this system existed, so it's
    searchable in the Knowledge Base immediately without going through the
    normal Open -> In Progress -> Resolved lifecycle.
    """

    title: str
    description: Optional[str] = ""
    language: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    severity: SeverityEnum = SeverityEnum.medium
    root_cause: str
    fix_recommendation: str


# ---------- Project Health Score ----------

class HealthScoreBreakdownOut(BaseModel):
    label: str
    penalty: float
    detail: str


class HealthScoreOut(BaseModel):
    score: int
    status: str
    total_bugs: int
    open_bugs: int
    critical_open_bugs: int
    resolved_bugs: int
    resolved_pct: float
    likely_duplicate_open_bugs: int
    avg_resolution_hours: float
    breakdown: List[HealthScoreBreakdownOut]


# ---------- AI Chat Assistant ----------

class ChatRequest(BaseModel):
    message: str
    context_bug_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    related_bug_ids: List[int] = []


# ---------- Analytics ----------

class CountItem(BaseModel):
    label: str
    count: int


class TimeSeriesPoint(BaseModel):
    date: str
    count: int


class AnalyticsSummary(BaseModel):
    total_bugs: int
    open_bugs: int
    resolved_bugs: int
    critical_bugs: int
    by_severity: List[CountItem]
    by_priority: List[CountItem]
    by_status: List[CountItem]
    by_category: List[CountItem]
    trend_last_30_days: List[TimeSeriesPoint]


# ---------- Admin Panel ----------

class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime.datetime
    bugs_reported: int = 0
    bugs_assigned: int = 0


class AdminUserRoleUpdate(BaseModel):
    role: str


class AdminUserListResponse(BaseModel):
    total: int
    items: List[AdminUserOut]


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    message: str
    related_bug_id: Optional[int] = None
    is_read: bool
    created_at: datetime.datetime


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    items: List[NotificationOut]


# ---------- Team Management ----------

class TeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    organization: Optional[str] = None
    status: str = "Active"
    created_at: Optional[datetime.datetime] = None


class TeamInvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    message: Optional[str] = None
    token: str
    status: str
    created_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None


class TeamInviteRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "Developer"
    message: Optional[str] = None


class TeamInviteResponse(BaseModel):
    success: bool
    message: str
    member: Optional[dict] = None


class MemberRoleUpdate(BaseModel):
    role: str


# ---------- Duplicate Check ----------

class DuplicateCheckRequest(BaseModel):
    text: str
    duplicate_threshold: Optional[float] = 0.8
    similar_threshold: Optional[float] = 0.25


class DuplicateCheckResponse(BaseModel):
    is_likely_duplicate: bool
    duplicate_threshold: float
    similar_threshold: float
    highest_similarity: float
    similar_bugs: List[dict] = []


# ---------- Global Search ----------

class SearchResultItem(BaseModel):
    type: str  # "bug", "knowledge", "team"
    id: int
    title: str
    snippet: str
    severity: Optional[str] = None
    status: Optional[str] = None
    url: str


class GlobalSearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int
    query: str


# ---------- Reports ----------

class ReportSummaryItem(BaseModel):
    total_bugs: int
    resolved_bugs: int
    critical_bugs: int
    high_bugs: int
    kb_entries: int
    resolution_rate: float
    ai_confidence_avg: float


class ReportItemOut(BaseModel):
    id: int
    title: str
    severity: str
    priority: str
    status: str
    module: str
    root_cause: str
    recommended_fix: str
    created_at: Optional[str] = None


class ReportGenerateResponse(BaseModel):
    report_type: str
    summary: ReportSummaryItem
    findings: List[str]
    items: List[ReportItemOut]


# ---------- Forgot / Reset Password ----------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class GenericResponse(BaseModel):
    success: bool
    message: str


# ---------- Vector Store Stats ----------

class VectorStoreStatsResponse(BaseModel):
    total_vectors: int
    dimension: int
    store_path: str
    meta_path: str
    is_loaded: bool