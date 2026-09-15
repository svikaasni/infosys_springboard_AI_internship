from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    # Bootstrap: the very first account created becomes Admin, since there's
    # no other way to reach the Admin Panel on a brand-new install. Anyone
    # registering after that gets their requested role EXCEPT "Admin" —
    # allowing a self-requested Admin role here would be a privilege
    # escalation hole, so it's silently downgraded to the default. Granting
    # Admin to someone after the first user requires an existing Admin,
    # either via the Admin Panel or PUT /api/auth/me (see require_admin()
    # and the check in update_me() below).
    is_first_user = db.query(models.User).count() == 0
    if is_first_user:
        role = "Admin"
    else:
        requested = payload.role or "Developer"
        role = "Developer" if requested == "Admin" else requested

    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=user)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserOut)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    name_val = payload.full_name or payload.name
    if name_val is not None:
        current_user.full_name = name_val
    if payload.email is not None and payload.email != current_user.email:
        # Verify email uniqueness
        dup = db.query(models.User).filter(models.User.email == payload.email, models.User.id != current_user.id).first()
        if dup:
            raise HTTPException(status_code=400, detail="This email is already in use by another account.")
        current_user.email = payload.email
    if payload.organization is not None:
        current_user.organization = payload.organization
    if payload.role is not None:
        if payload.role == "Admin" and current_user.role != "Admin":
            raise HTTPException(
                status_code=403,
                detail="Only an existing Admin can grant the Admin role. Ask an admin to promote you from the Admin Panel.",
            )
        if current_user.role == "Admin" and payload.role != "Admin":
            raise HTTPException(
                status_code=400,
                detail="You can't demote yourself out of Admin here. Ask another Admin to do it from the Admin Panel.",
            )
        current_user.role = payload.role
    if payload.password:
        current_user.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/profile", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Profile update endpoint matching frontend profile form."""
    return update_me(payload, db, current_user)


@router.post("/change-password", response_model=schemas.GenericResponse)
def change_password(
    payload: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed. Please check your existing password.",
        )
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters in length.",
        )
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return schemas.GenericResponse(success=True, message="Password changed successfully.")


@router.post("/forgot-password", response_model=schemas.GenericResponse)
def forgot_password(
    payload: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Generate account recovery token for forgot password."""
    import uuid
    import datetime
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    # Return success even if user not found to prevent user enumeration attacks
    if user:
        reset_token = f"rst_{uuid.uuid4().hex}"
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        token_entry = models.PasswordResetToken(
            email=user.email,
            token=reset_token,
            is_used=False,
            created_at=datetime.datetime.utcnow(),
            expires_at=expires_at,
        )
        db.add(token_entry)
        db.commit()

    return schemas.GenericResponse(
        success=True,
        message="If this email is registered in our system, a password reset link has been dispatched.",
    )


@router.post("/reset-password", response_model=schemas.GenericResponse)
def reset_password(
    payload: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using a valid reset token."""
    import datetime
    token_entry = (
        db.query(models.PasswordResetToken)
        .filter(
            models.PasswordResetToken.token == payload.token,
            models.PasswordResetToken.is_used == False,
            models.PasswordResetToken.expires_at > datetime.datetime.utcnow(),
        )
        .first()
    )
    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")

    user = db.query(models.User).filter(models.User.email == token_entry.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters in length.")

    user.hashed_password = hash_password(payload.new_password)
    token_entry.is_used = True
    db.commit()

    return schemas.GenericResponse(success=True, message="Your password has been reset successfully.")

