from uuid import UUID, uuid4
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
from database import get_db
from middleware.governance import create_audit_entry

router = APIRouter(
    prefix="/api/super-admin",
    tags=["Super Admin Governance"],
)

@router.get("/dashboard", response_model=schemas.SuperAdminDashboard)
async def get_super_admin_metrics(
    db: AsyncSession = Depends(get_db)
):
    """
    Computes system metrics across all tables:
    Total Admins, Teachers, Students, Pending Approvals, Unresolved Security Events, Quarantined Items, etc.
    """
    num_admins = (await db.execute(select(func.count()).select_from(models.Admin))).scalar() or 0
    num_teachers = (await db.execute(select(func.count()).select_from(models.Teacher).where(models.Teacher.is_deleted == False))).scalar() or 0
    num_students = (await db.execute(select(func.count()).select_from(models.Student).where(models.Student.is_deleted == False))).scalar() or 0
    
    pending_deletions = (await db.execute(select(func.count()).select_from(models.DeletionRequest).where(models.DeletionRequest.status == models.RequestStatus.PENDING))).scalar() or 0
    pending_edits = (await db.execute(select(func.count()).select_from(models.EditRequest).where(models.EditRequest.status == models.RequestStatus.PENDING))).scalar() or 0
    
    sec_events = (await db.execute(select(func.count()).select_from(models.SecurityEvent).where(models.SecurityEvent.resolved == False))).scalar() or 0
    quarantine_cnt = (await db.execute(select(func.count()).select_from(models.QuarantineRecord))).scalar() or 0
    audit_cnt = (await db.execute(select(func.count()).select_from(models.AuditLog))).scalar() or 0

    return schemas.SuperAdminDashboard(
        total_admins=num_admins,
        total_teachers=num_teachers,
        total_students=num_students,
        active_sessions=1,
        pending_deletion_requests=pending_deletions,
        pending_edit_requests=pending_edits,
        unresolved_security_events=sec_events,
        active_restrictions=0,
        quarantined_items=quarantine_cnt,
        recent_failed_logins=0,
        recent_audit_events=audit_cnt
    )


@router.get("/admins")
async def list_admins(db: AsyncSession = Depends(get_db)):
    """List all Admins in the platform (Supports multiple admins)."""
    result = await db.execute(select(models.Admin))
    admins = result.scalars().all()
    return [{
        "id": str(a.id),
        "name": a.name,
        "email": a.email,
        "is_active": a.is_active,
        "is_superadmin": a.is_superadmin,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in admins]


@router.post("/admins", status_code=201)
async def create_admin(
    name: str,
    email: str,
    password: str = "AdminSecret123!",
    x_actor_role: str = Header(default="super_admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin creates a new Admin account."""
    if x_actor_role.lower() != models.ActorType.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super Admin can create Admin accounts.")

    # Check email duplicate
    existing = (await db.execute(select(models.Admin).where(models.Admin.email == email))).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin email already exists.")

    new_admin = models.Admin(
        name=name,
        email=email,
        password_hash=f"hashed_{password}",
        is_active=True,
        is_superadmin=False
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    await create_audit_entry(
        db,
        action=models.AuditAction.CREATE,
        entity_type=models.EntityType.ADMIN,
        entity_id=str(new_admin.id),
        actor_type=models.ActorType.SUPER_ADMIN,
        actor_id=x_actor_id,
        reason=f"Super Admin created Admin account for {name}"
    )

    return {"id": str(new_admin.id), "name": new_admin.name, "email": new_admin.email}
