import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Bug, User, StatusEnum
from app.schemas import GlobalSearchResponse, SearchResultItem
from app.auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=GlobalSearchResponse)
def global_search(
    q: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query_text = q.strip()
    if not query_text:
        return GlobalSearchResponse(results=[], total=0, query="")

    # Extract potential numerical IDs (e.g. "#109", "KB 52", "109")
    id_matches = re.findall(r'\d+', query_text)
    numeric_id = int(id_matches[0]) if id_matches else None

    # 1. Search Bugs
    bug_conditions = [
        Bug.title.ilike(f"%{query_text}%"),
        Bug.description.ilike(f"%{query_text}%"),
        Bug.module.ilike(f"%{query_text}%"),
    ]
    if numeric_id:
        bug_conditions.append(Bug.id == numeric_id)

    bugs = db.query(Bug).filter(or_(*bug_conditions)).limit(6).all()

    # 2. Search Knowledge Base (resolved bugs with resolution notes)
    kb_conditions = [
        Bug.title.ilike(f"%{query_text}%"),
        Bug.description.ilike(f"%{query_text}%"),
        Bug.resolution_notes.ilike(f"%{query_text}%"),
    ]
    if numeric_id:
        kb_conditions.append(Bug.id == numeric_id)

    kbs = (
        db.query(Bug)
        .filter(
            Bug.status.in_([StatusEnum.resolved, StatusEnum.closed]),
            Bug.resolution_notes.isnot(None),
            Bug.resolution_notes != "",
            or_(*kb_conditions),
        )
        .limit(6)
        .all()
    )

    # 3. Search Team Members
    user_conditions = [
        User.full_name.ilike(f"%{query_text}%"),
        User.email.ilike(f"%{query_text}%"),
        User.role.ilike(f"%{query_text}%"),
    ]
    if hasattr(User, "organization"):
        user_conditions.append(User.organization.ilike(f"%{query_text}%"))

    users = db.query(User).filter(or_(*user_conditions)).limit(4).all()

    results = []
    seen_bug_ids = set()

    for b in bugs:
        seen_bug_ids.add(b.id)
        severity_val = b.severity.value if hasattr(b.severity, "value") else str(b.severity)
        status_val = b.status.value if hasattr(b.status, "value") else str(b.status)
        results.append(
            SearchResultItem(
                type="bug",
                id=b.id,
                title=f"Bug #{b.id}: {b.title}",
                snippet=(b.description or "")[:140],
                severity=severity_val,
                status=status_val,
                url=f"/bugs/{b.id}",
            )
        )

    for k in kbs:
        if k.id in seen_bug_ids and len(bugs) > 0:
            # Still show as KB if it has resolution notes, with /knowledge-base url
            pass
        severity_val = k.severity.value if hasattr(k.severity, "value") else str(k.severity)
        results.append(
            SearchResultItem(
                type="knowledge",
                id=k.id,
                title=f"KB #{k.id}: {k.title}",
                snippet=(k.resolution_notes or k.description or "")[:140],
                severity=severity_val,
                url=f"/knowledge-base",
            )
        )

    for u in users:
        org_val = getattr(u, "organization", "TechCorp Solutions") or "TechCorp Solutions"
        results.append(
            SearchResultItem(
                type="team",
                id=u.id,
                title=f"Team Member: {u.full_name} ({u.role})",
                snippet=f"Email: {u.email} • Organization: {org_val}",
                url="/team",
            )
        )

    return GlobalSearchResponse(
        results=results,
        total=len(results),
        query=query_text,
    )
