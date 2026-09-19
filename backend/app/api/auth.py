from datetime import datetime, timezone

from app.core.deps import get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    generate_reset_token,
    get_reset_token_expiry,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.core.email import send_reset_password_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Always return the same response whether or not the email exists,
    # so we don't leak which emails are registered.
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expires = get_reset_token_expiry()
    db.commit()

    reset_link = f"{ resolve_frontend_url() }/reset-password?token={token}"
    email_sent = send_reset_password_email(user.email, reset_link)

    response = {"message": "If that email is registered, a reset link has been sent."}

    # Dev convenience: if the email service isn't configured or delivery
    # failed (e.g. testing without a verified domain), still return the link
    # so the flow can be tested. Remove this block once email is confirmed
    # working end-to-end in production.
    if not email_sent:
        response["dev_reset_link"] = reset_link

    return response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()

    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password has been reset successfully."}


def resolve_frontend_url() -> str:
    import os
    return os.getenv("FRONTEND_URL", "http://localhost:3000")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


from app.core.deps import require_role
from app.models.user import UserRole


@router.get("/admin-only")
def admin_only_route(current_user: User = Depends(require_role(UserRole.admin))):
    return {"message": f"Welcome admin {current_user.email}"}