import time
from typing import Callable, Optional
from fastapi import Request, Response, HTTPException, status, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models
from database import get_db

# Hierarchy definition: Higher index = higher privilege
ROLE_HIERARCHY = {
    models.ActorType.SUPER_ADMIN: 4,
    models.ActorType.ADMIN: 3,
    models.ActorType.TEACHER: 2,
    models.ActorType.STUDENT: 1,
    models.ActorType.ANONYMOUS: 0,
}

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enterprise Security Middleware injecting HTTP defense headers:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Strict-Transport-Security: max-age=31536000; includeSubDomains
    - Referrer-Policy: strict-origin-when-cross-origin
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Powered-By"] = "Sygnus Security Core"
        return response


class RoleChecker:
    """
    Middleware & Dependency enforcing Strict Role Hierarchy.
    Super Admin > Admin > Teacher > Student
    """
    def __init__(self, minimum_role: models.ActorType):
        self.minimum_role = minimum_role

    async def __call__(self, request: Request):
        # Extract role from headers or default to headers/token simulation
        actor_role_str = request.headers.get("X-Actor-Role", models.ActorType.STUDENT.value)
        try:
            actor_role = models.ActorType(actor_role_str.lower())
        except ValueError:
            actor_role = models.ActorType.STUDENT

        user_level = ROLE_HIERARCHY.get(actor_role, 1)
        required_level = ROLE_HIERARCHY.get(self.minimum_role, 1)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Chain of Command Access Denied: Requires minimum role of '{self.minimum_role.value}', but actor is '{actor_role.value}'."
            )
        
        request.state.actor_role = actor_role
        return actor_role


async def create_audit_entry(
    db: AsyncSession,
    action: models.AuditAction,
    entity_type: models.EntityType,
    entity_id: Optional[str] = None,
    actor_type: models.ActorType = models.ActorType.SYSTEM,
    actor_id: Optional[str] = None,
    reason: Optional[str] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    """
    Helper function to log every sensitive operation into the immutable AuditLog table.
    """
    audit = models.AuditLog(
        request_id=f"req_{entity_id or 'sys'}",
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        status=models.AuditStatus.SUCCESS,
        reason=reason,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address or "127.0.0.1"
    )
    db.add(audit)
    await db.commit()

