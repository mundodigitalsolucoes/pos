from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
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


class GoogleLinkBody(BaseModel):
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


def _get_stored_google_subject(session: Session, user_id: int) -> str | None:
    result = session.execute(
        text('SELECT google_subject FROM "user" WHERE id = :user_id'),
        {"user_id": user_id},
    ).first()
    if not result:
        return None
    return result[0]


def _link_google_identity(
    session: Session,
    user: models.User,
    subject: str,
    full_name: str | None,
) -> None:
    session.execute(
        text(
            'UPDATE "user" '
            'SET google_subject = :subject, auth_provider = :provider, '
            'full_name = COALESCE(full_name, :full_name) '
            'WHERE id = :user_id'
        ),
        {
            "subject": subject,
            "provider": "google",
            "full_name": full_name,
            "user_id": user.id,
        },
    )
    session.commit()
    if not user.full_name and full_name:
        user.full_name = full_name


def _record_login_event(session: Session, user: models.User) -> None:
    session.add(
        models.LoginEvent(
            user_id=user.id,
            role=user.role,
            tenant_id=user.tenant_id,
            provider_id=user.provider_id,
            login_scope="tenant",
        )
    )
    session.commit()


def _verify_google_credential(credential: str):
    try:
        return verify_google_id_token(credential, settings.google_client_id)
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


@router.get("/google/config")
def google_auth_config() -> dict:
    """Public browser configuration. A Google OAuth client ID is not a secret."""
    client_id = settings.google_client_id.strip()
    return {"enabled": bool(client_id), "client_id": client_id}


@router.post("/google/link")
def link_google_identity_for_current_user(
    body: GoogleLinkBody,
    current_user: models.User = Depends(security.get_current_user),
    session: Session = Depends(get_session),
) -> dict:
    """Bind a verified Google identity to the currently authenticated tenant user."""
    if (
        current_user.tenant_id is None
        or current_user.provider_id is not None
        or current_user.role == models.UserRole.platform_operator
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google linking is not available for this account type",
        )

    identity = _verify_google_credential(body.credential)
    if identity.email.strip().lower() != current_user.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Google email does not match the signed-in MDS Food account",
        )

    stored_subject = _get_stored_google_subject(session, int(current_user.id))
    if stored_subject and stored_subject != identity.subject:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is linked to another Google identity",
        )

    if not stored_subject:
        _link_google_identity(session, current_user, identity.subject, identity.full_name)

    return {
        "status": "linked",
        "email": current_user.email,
        "tenant_id": current_user.tenant_id,
    }


@router.post("/google")
def login_with_google(
    request: Request,
    body: GoogleLoginBody,
    session: Session = Depends(get_session),
) -> JSONResponse:
    identity = _verify_google_credential(body.credential)

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
            },
        )

    # Google sign-in on this endpoint is intentionally tenant-only. Platform and
    # provider identities remain isolated from the restaurant login surface.
    if (
        user.tenant_id is None
        or user.provider_id is not None
        or user.role == models.UserRole.platform_operator
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google sign-in is not available for this account type",
        )

    stored_subject = _get_stored_google_subject(session, int(user.id))
    if stored_subject and stored_subject != identity.subject:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account is linked to another Google identity",
        )

    if not stored_subject:
        _link_google_identity(session, user, identity.subject, identity.full_name)

    # Preserve MDS Food TOTP as a second factor even when Google authenticated
    # the primary identity.
    if getattr(user, "otp_enabled", False) and getattr(user, "otp_secret", None):
        temp_token = security.create_otp_pending_token(_token_data_for_user(user))
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": "OTP required",
                "require_otp": True,
                "temp_token": temp_token,
            },
        )

    _record_login_event(session, user)
    return _issue_session_cookies(user)
