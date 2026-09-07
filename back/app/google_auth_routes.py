from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from . import models, security
from .db import get_session
from .google_auth import (
    GoogleAuthConfigurationError,
    GoogleTokenValidationError,
    verify_google_id_token,
)
from .settings import settings


router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginBody(BaseModel):
    credential: str = Field(min_length=1)


def _token_data_for_user(user: models.User) -> dict:
    return {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
        "is_platform_operator": user.role == models.UserRole.platform_operator,
    }


def _issue_session_cookies(user: models.User) -> JSONResponse:
    token_data = _token_data_for_user(user)
    access_token = security.create_access_token(
        data=token_data,
        expires_delta=security.timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = security.create_refresh_token(
        data=token_data,
        expires_delta=security.timedelta(days=settings.refresh_token_expire_days),
    )

    response = JSONResponse(
        content={
            "status": "success",
            "message": "Logged in",
            "tenant_id": user.tenant_id,
            "email": user.email,
        }
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )
    return response


@router.post("/google")
def login_with_google(
    request: Request,
    body: GoogleLoginBody,
    session: Session = Depends(get_session),
) -> JSONResponse:
    try:
        identity = verify_google_id_token(body.credential, settings.google_client_id)
    except GoogleAuthConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except GoogleTokenValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    user = session.exec(
        select(models.User).where(models.User.email == identity.email)
    ).first()
    if not user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "status": "signup_required",
                "message": "No MDS Food account exists for this Google email",
                "email": identity.email,
                "full_name": identity.full_name,
                "google_subject": identity.subject,
            },
        )

    stored_subject = getattr(user, "google_subject", None)
    if stored_subject and stored_subject != identity.subject:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is linked to another Google identity",
        )

    if hasattr(user, "google_subject") and not stored_subject:
        user.google_subject = identity.subject
        user.auth_provider = "google"
        if not user.full_name and identity.full_name:
            user.full_name = identity.full_name
        session.add(user)
        session.commit()
        session.refresh(user)

    return _issue_session_cookies(user)
