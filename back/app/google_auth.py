from __future__ import annotations

from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    full_name: str | None


class GoogleAuthConfigurationError(RuntimeError):
    pass


class GoogleTokenValidationError(ValueError):
    pass


def verify_google_id_token(credential: str, client_id: str) -> GoogleIdentity:
    """Verify a Google Identity Services ID token and return the normalized identity.

    The browser-supplied credential is never trusted directly. Signature, issuer,
    audience and expiry are validated by google-auth before any account lookup.
    """
    if not client_id.strip():
        raise GoogleAuthConfigurationError("Google authentication is not configured")
    if not credential or not credential.strip():
        raise GoogleTokenValidationError("Missing Google credential")

    try:
        payload = id_token.verify_oauth2_token(
            credential.strip(),
            google_requests.Request(),
            client_id.strip(),
        )
    except Exception as exc:  # google-auth raises several validation/network errors
        raise GoogleTokenValidationError("Invalid Google credential") from exc

    subject = str(payload.get("sub") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    email_verified = payload.get("email_verified") is True
    full_name_raw = payload.get("name")
    full_name = str(full_name_raw).strip() if full_name_raw else None

    if not subject or not email or not email_verified:
        raise GoogleTokenValidationError("Google account email is not verified")

    return GoogleIdentity(subject=subject, email=email, full_name=full_name)
