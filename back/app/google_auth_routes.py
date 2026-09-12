from __future__ import annotations

from datetime import timedelta
import secrets
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from . import models, security
from .contact_validation import normalize_email_address, normalize_phone_e164
from .db import get_session
from .google_auth import (
    GoogleAuthConfigurationError,
    GoogleTokenValidationError,
    verify_google_id_token,
)
from .onboarding import assign_maps_url
from .rate_limits import limiter, rate_limit_key_user
from .saas_billing import initial_status_for_new_tenant
from .settings import settings
from .tenant_ui_modules import new_tenant_ui_modules_stored


router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginBody(BaseModel):
    credential: str = Field(min_length=1)


class GoogleLinkBody(BaseModel):
    credential: str = Field(min_length=1)


class GoogleSignupBody(BaseModel):
    credential: str = Field(min_length=1)
    tenant_name: str = Field(min_length=1, max_length=200)
    address: str = Field(min_length=1, max_length=500)
    phone: str = Field(min_length=1, max_length=64)
    maps_url: str | None = Field(default=None, max_length=2000)


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
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = security.create_refresh_token(
        data=token_data,
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
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


def _get_user_by_google_subject(session: Session, subject: str) -> models.User | None:
    row = session.execute(
        text('SELECT id FROM "user" WHERE google_subject = :subject LIMIT 1'),
        {"subject": subject},
    ).first()
    if not row:
        return None
    return session.get(models.User, int(row[0]))


def _link_google_identity(
    session: Session,
    user: models.User,
    subject: str,
    full_name: str | None,
) -> None:
    existing = _get_user_by_google_subject(session, subject)
    if existing and existing.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This Google identity is already linked to another MDS Food account",
        )

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


def _normalize_maps_url(value: str | None) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid maps URL",
        )
    return raw


@router.get("/google/config")
def google_auth_config() -> dict:
    """Public browser configuration. A Google OAuth client ID is not a secret."""
    client_id = settings.google_client_id.strip()
    return {"enabled": bool(client_id), "client_id": client_id}


@router.post("/google/signup")
@limiter.limit(f"{getattr(settings, 'rate_limit_register_per_hour', 3)}/hour")
def signup_with_google(
    request: Request,
    body: GoogleSignupBody,
    session: Session = Depends(get_session),
) -> JSONResponse:
    """Create a new tenant owner directly from a verified Google identity."""
    identity = _verify_google_credential(body.credential)

    try:
        email = normalize_email_address(identity.email)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google email",
        ) from exc

    tenant_name = body.tenant_name.strip()
    address = body.address.strip()
    if not tenant_name or not address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Restaurant name and address are required",
        )

    try:
        phone = normalize_phone_e164(body.phone, settings.default_phone_country)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number",
        ) from exc
    maps_url = _normalize_maps_url(body.maps_url)

    subject_owner = _get_user_by_google_subject(session, identity.subject)
    if subject_owner:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "google_identity_already_registered",
                "message": "This Google identity already has an MDS Food account",
            },
        )

    existing_user = session.exec(
        select(models.User).where(models.User.email == email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "google_link_required",
                "message": "Sign in with your existing MDS Food account to link Google safely",
            },
        )

    try:
        tenant_count = session.exec(select(models.Tenant)).all()
        user_count = session.exec(select(models.User)).all()
        if len(user_count) == 0 and len(tenant_count) == 1:
            tenant = tenant_count[0]
        else:
            tenant = models.Tenant(
                name=tenant_name,
                ui_modules=new_tenant_ui_modules_stored(),
                saas_subscription_status=initial_status_for_new_tenant(),
            )
            session.add(tenant)
            session.flush()

        tenant.address = address
        tenant.phone = phone
        if maps_url:
            assign_maps_url(tenant, maps_url)
        session.add(tenant)
        session.flush()

        user = models.User(
            email=email,
            hashed_password=security.get_password_hash(secrets.token_urlsafe(48)),
            full_name=identity.full_name,
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        session.add(user)
        session.flush()

        session.execute(
            text(
                'UPDATE "user" '
                'SET google_subject = :subject, auth_provider = :provider '
                'WHERE id = :user_id'
            ),
            {
                "subject": identity.subject,
                "provider": "google",
                "user_id": user.id,
            },
        )
        session.commit()
        session.refresh(user)
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "google_signup_conflict",
                "message": "This Google account or email is already registered",
            },
        ) from exc

    _record_login_event(session, user)
    response = _issue_session_cookies(user)
    response.status_code = status.HTTP_201_CREATED
    return response


@router.post("/google/link")
@limiter.limit(
    f"{getattr(settings, 'rate_limit_admin_per_minute', 30)}/minute",
    key_func=rate_limit_key_user,
)
def link_google_identity_for_current_user(
    request: Request,
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
@limiter.limit(
    f"{getattr(settings, 'rate_limit_login_per_15min', 5)}/15 minutes"
)
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
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "google_link_required",
                "message": "Sign in with your password once to link this Google account",
            },
        )

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
