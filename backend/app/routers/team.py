import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, TeamInvitation, Bug
from app.schemas import (
    UserOut,
    TeamInvitationOut,
    TeamInviteRequest,
    TeamInviteResponse,
    MemberRoleUpdate,
)
from app.auth import get_current_user, hash_password

router = APIRouter(prefix="/api/team", tags=["team"])

VALID_ROLES = {"Admin", "Team Lead", "Developer", "QA Engineer", "Engineering Manager", "Viewer"}


@router.get("/members", response_model=List[UserOut])
def get_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all team members."""
    members = db.query(User).order_by(User.id.asc()).all()
    return members


@router.get("/invitations", response_model=List[TeamInvitationOut])
def get_pending_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all pending invitations stored in the database."""
    invites = db.query(TeamInvitation).order_by(TeamInvitation.created_at.desc()).all()
    return invites


@router.post("/invite", response_model=TeamInviteResponse, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    payload: TeamInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite a new team member with database-backed invitation tracking."""
    name = payload.name.strip()
    email = payload.email.strip().lower()
    role = payload.role.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full Name is required and cannot be empty.",
        )

    # Standardize role case matching VALID_ROLES
    matched_role = next((r for r in VALID_ROLES if r.lower() == role.lower()), None)
    if not matched_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed roles are: {', '.join(sorted(VALID_ROLES))}",
        )

    # Check for duplicate email in User table
    existing_user = db.query(User).filter(User.email.ilike(email)).first()
    if existing_user:
        if (getattr(existing_user, "status", "Active") or "").lower() == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An invitation is already pending for this email address.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already an active team member.",
            )

    # Create invitation record
    inv_token = f"inv_{uuid.uuid4().hex}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    invitation = TeamInvitation(
        email=email,
        role=matched_role,
        message=payload.message.strip() if payload.message else None,
        token=inv_token,
        invited_by_id=current_user.id,
        status="Pending",
        created_at=datetime.datetime.utcnow(),
        expires_at=expires_at,
    )
    db.add(invitation)

    # Create pending user record so they appear in workspace lists
    new_member = User(
        full_name=name,
        email=email,
        role=matched_role,
        status="Pending",
        organization="TechCorp Solutions",
        hashed_password=hash_password(f"temp_pass_{uuid.uuid4().hex[:8]}"),
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return TeamInviteResponse(
        success=True,
        message="Invitation created successfully in database.",
        member={
            "id": new_member.id,
            "name": new_member.full_name,
            "email": new_member.email,
            "role": new_member.role,
            "status": new_member.status,
            "created_at": new_member.created_at.isoformat() if new_member.created_at else None,
        },
    )


@router.delete("/invitations/{inv_id}")
def cancel_invitation(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a pending team invitation."""
    inv = db.query(TeamInvitation).filter(TeamInvitation.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    inv.status = "Canceled"
    # Also clean up pending user placeholder if not activated
    user = db.query(User).filter(User.email.ilike(inv.email), User.status == "Pending").first()
    if user:
        db.delete(user)
    db.commit()
    return {"success": True, "message": "Invitation canceled successfully."}


@router.post("/invitations/{inv_id}/resend")
def resend_invitation(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resend / renew a team invitation in database."""
    inv = db.query(TeamInvitation).filter(TeamInvitation.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    inv.status = "Pending"
    inv.expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    db.commit()
    return {"success": True, "message": "Invitation renewed successfully (valid for 7 days)."}


@router.patch("/members/{member_id}/role")
@router.put("/members/{member_id}/role")
def update_member_role(
    member_id: int,
    payload: MemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a team member's role and persist changes in SQLite."""
    role = payload.role.strip()
    matched_role = next((r for r in VALID_ROLES if r.lower() == role.lower()), None)
    if not matched_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Allowed roles are: {', '.join(sorted(VALID_ROLES))}",
        )

    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found.",
        )

    if member.id == current_user.id and current_user.role == "Admin" and matched_role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot demote yourself from Admin.",
        )

    member.role = matched_role
    db.commit()
    db.refresh(member)

    return {
        "success": True,
        "message": f"Role updated to {member.role} successfully",
        "member": {
            "id": member.id,
            "name": member.full_name,
            "email": member.email,
            "role": member.role,
            "status": member.status or "Active",
            "created_at": member.created_at.isoformat() if member.created_at else None,
        },
    }


@router.delete("/members/{member_id}")
def remove_team_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a team member from the workspace."""
    if member_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own account from team management.",
        )

    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found.",
        )

    # Unassign any assigned bugs
    db.query(Bug).filter(Bug.assignee_id == member.id).update({"assignee_id": None})
    try:
        db.delete(member)
        db.commit()
    except Exception:
        db.rollback()
        member.status = "Removed"
        db.commit()

    return {"success": True, "message": "Team member removed successfully."}
