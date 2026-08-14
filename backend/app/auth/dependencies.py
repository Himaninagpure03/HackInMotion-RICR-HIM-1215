"""
Verifies session tokens issued by Clerk.

Flow:
  1. React frontend logs the user in via Clerk's SDK (<SignIn />, useAuth, etc.)
  2. Frontend calls `await getToken()` and sends it as `Authorization: Bearer <token>`
  3. This module fetches Clerk's public keys (JWKS), verifies the token's
     signature + issuer, and hands back the decoded payload.

No passwords, sessions, or Clerk secret key are needed for this — verification
is purely signature-based against Clerk's public JWKS endpoint.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from ..core.config import settings

security = HTTPBearer()

# PyJWKClient caches keys internally and re-fetches on unknown key IDs,
# so this is safe to keep as a module-level singleton.
_jwk_client = PyJWKClient(settings.jwks_url)


def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        signing_key = _jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},  # Clerk doesn't set `aud` by default
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def get_current_user_id(payload: dict = Depends(verify_clerk_token)) -> str:
    """The Clerk user ID (`sub` claim) — use this as the FK for all your app data."""
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject claim")
    return sub
