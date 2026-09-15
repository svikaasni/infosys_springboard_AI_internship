from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Roles assignable from the Admin Panel. "Admin" is included here since an
# existing Admin promoting someone else is the intended path (as opposed to
# the blocked self-service path in PUT /api/auth/me).
ASSIGNABLE_ROLES = {"Admin", "Team Lead", "Developer", "QA Engineer", "Engineering Manager"}


def _to_admin_user_out(db: Session, user: models.User) -> schemas.AdminUserOut:
    reported = db.query(models.Bug).filter(models.Bug.reporter_id == user.id).count()
    assigned = db.query(models.Bug).filter(models.Bug.assignee_id == user.id).count()
    return schemas.AdminUserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        bugs_reported=reported,
        bugs_assigned=assigned,
    )


@router.get("/users", response_model=schemas.AdminUserListResponse)
def list_users(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    total = db.query(models.User).count()
    users = (
        db.query(models.User)
        .order_by(models.User.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_to_admin_user_out(db, u) for u in users]
    return schemas.AdminUserListResponse(total=total, items=items)


@router.patch("/users/{user_id}/role", response_model=schemas.AdminUserOut)
def update_user_role(
    user_id: int,
    payload: schemas.AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if payload.role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(sorted(ASSIGNABLE_ROLES))}")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and payload.role != "Admin":
        raise HTTPException(status_code=400, detail="You can't demote yourself. Ask another Admin to do it.")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return _to_admin_user_out(db, user)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You can't delete your own account from the Admin Panel.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Deleting a user cascades to their reported bugs (see the
    # cascade="all, delete-orphan" on User.bugs in models.py) — bugs they
    # were only assigned to, not reported, are unassigned instead of deleted.
    db.query(models.Bug).filter(models.Bug.assignee_id == user.id).update({"assignee_id": None})
    db.delete(user)
    db.commit()
    return None
