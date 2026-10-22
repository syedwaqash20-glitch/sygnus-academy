from uuid import UUID, uuid4
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
from database import get_db
from middleware.governance import RoleChecker, create_audit_entry

router = APIRouter(
    prefix="/api/governance",
    tags=["Governance & Approval Matrix"],
)

# ============================================================
# 1. DELETION REQUEST WORKFLOW
# ============================================================

@router.post("/deletion-requests", response_model=schemas.DeletionRequestResponse)
async def request_deletion(
    req: schemas.DeletionRequestCreate,
    x_actor_role: str = Header(default="admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Admins or Teachers submit a deletion request. 
    Nothing is deleted directly; a DeletionRequest is generated in PENDING state.
    """
    actor_type = models.ActorType(x_actor_role.lower())
    
    del_req = models.DeletionRequest(
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        requested_by_type=actor_type,
        requested_by_id=UUID(x_actor_id) if x_actor_id else None,
        request_reason=req.request_reason,
        status=models.RequestStatus.PENDING,
        snapshot={"entity_type": req.entity_type, "entity_id": str(req.entity_id)}
    )
    db.add(del_req)
    await db.commit()
    await db.refresh(del_req)

    await create_audit_entry(
        db,
        action=models.AuditAction.DELETE_REQUESTED,
        entity_type=req.entity_type,
        entity_id=str(req.entity_id),
        actor_type=actor_type,
        actor_id=x_actor_id,
        reason=f"Deletion Requested: {req.request_reason}"
    )

    return del_req


@router.get("/deletion-requests", response_model=List[schemas.DeletionRequestResponse])
async def list_pending_deletion_requests(
    db: AsyncSession = Depends(get_db)
):
    """List all pending deletion requests for Super Admin approval queue."""
    result = await db.execute(
        select(models.DeletionRequest)
        .order_by(models.DeletionRequest.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/deletion-requests/{id}/decision", response_model=schemas.DeletionRequestResponse)
async def decide_deletion_request(
    id: UUID,
    decision: schemas.DeletionDecision,
    x_actor_role: str = Header(default="super_admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin exclusively approves or rejects a deletion request.
    If Approved: Target entity soft-deleted (is_deleted=True).
    If Rejected: Request marked REJECTED, data preserved untouched.
    """
    if x_actor_role.lower() != models.ActorType.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chain of Command Violation: Only Super Admin can decide Deletion Requests."
        )

    result = await db.execute(
        select(models.DeletionRequest).where(models.DeletionRequest.id == id)
    )
    del_req = result.scalars().first()

    if not del_req:
        raise HTTPException(status_code=404, detail="Deletion Request not found.")

    del_req.decided_at = datetime.now(timezone.utc)
    del_req.decision_reason = decision.decision_reason
    del_req.approved_by = UUID(x_actor_id) if x_actor_id else None

    if decision.approved:
        del_req.status = models.RequestStatus.APPROVED
        del_req.executed_at = datetime.now(timezone.utc)

        # Apply soft deletion to target entity
        if del_req.entity_type == models.EntityType.TEACHER:
            await db.execute(
                update(models.Teacher)
                .where(models.Teacher.id == del_req.entity_id)
                .values(is_deleted=True)
            )
        elif del_req.entity_type == models.EntityType.STUDENT:
            await db.execute(
                update(models.Student)
                .where(models.Student.id == del_req.entity_id)
                .values(is_deleted=True)
            )
        elif del_req.entity_type == models.EntityType.COURSE:
            await db.execute(
                update(models.Course)
                .where(models.Course.id == del_req.entity_id)
                .values(is_deleted=True)
            )

        # Also register in Quarantine table
        quarantine = models.QuarantineRecord(
            entity_type=del_req.entity_type,
            entity_id=del_req.entity_id,
            snapshot=del_req.snapshot,
            deleted_by_type=models.ActorType.SUPER_ADMIN,
            deleted_by_id=del_req.approved_by,
            deletion_reason=decision.decision_reason,
            deletion_request_id=del_req.id,
            status=models.QuarantineStatus.QUARANTINED
        )
        db.add(quarantine)

        action_logged = models.AuditAction.DELETE_APPROVED
    else:
        del_req.status = models.RequestStatus.REJECTED
        action_logged = models.AuditAction.DELETE_REJECTED

    await db.commit()
    await db.refresh(del_req)

    await create_audit_entry(
        db,
        action=action_logged,
        entity_type=del_req.entity_type,
        entity_id=str(del_req.entity_id),
        actor_type=models.ActorType.SUPER_ADMIN,
        actor_id=x_actor_id,
        reason=f"Super Admin Decision: {'APPROVED' if decision.approved else 'REJECTED'} - {decision.decision_reason}"
    )

    return del_req


# ============================================================
# 2. EDIT REQUEST WORKFLOW
# ============================================================

@router.post("/edit-requests", response_model=schemas.EditRequestResponse)
async def request_edit(
    req: schemas.EditRequestCreate,
    x_actor_role: str = Header(default="admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits an Edit Request for sensitive records.
    Stores old and requested new values; original record remains unmodified until approved.
    """
    actor_type = models.ActorType(x_actor_role.lower())
    
    # Fetch old values snapshot
    old_vals = {}
    if req.entity_type == models.EntityType.TEACHER:
        res = await db.execute(select(models.Teacher).where(models.Teacher.id == req.entity_id))
        t = res.scalars().first()
        if t: old_vals = {"name": t.name, "email": t.email}
    elif req.entity_type == models.EntityType.STUDENT:
        res = await db.execute(select(models.Student).where(models.Student.id == req.entity_id))
        s = res.scalars().first()
        if s: old_vals = {"name": s.name, "email": s.email}
    elif req.entity_type == models.EntityType.COURSE:
        res = await db.execute(select(models.Course).where(models.Course.id == req.entity_id))
        c = res.scalars().first()
        if c: old_vals = {"title": c.title, "code": c.code, "price": str(c.price or 0)}

    edit_req = models.EditRequest(
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        requested_by_type=actor_type,
        requested_by_id=UUID(x_actor_id) if x_actor_id else None,
        reason=req.reason,
        old_values=old_vals,
        requested_values=req.requested_values,
        status=models.RequestStatus.PENDING
    )
    db.add(edit_req)
    await db.commit()
    await db.refresh(edit_req)

    await create_audit_entry(
        db,
        action=models.AuditAction.EDIT_REQUESTED,
        entity_type=req.entity_type,
        entity_id=str(req.entity_id),
        actor_type=actor_type,
        actor_id=x_actor_id,
        reason=f"Edit Requested: {req.reason}"
    )

    return edit_req


@router.get("/edit-requests", response_model=List[schemas.EditRequestResponse])
async def list_pending_edit_requests(
    db: AsyncSession = Depends(get_db)
):
    """List pending edit requests for Super Admin review."""
    result = await db.execute(
        select(models.EditRequest)
        .order_by(models.EditRequest.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/edit-requests/{id}/decision", response_model=schemas.EditRequestResponse)
async def decide_edit_request(
    id: UUID,
    decision: schemas.EditDecision,
    x_actor_role: str = Header(default="super_admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Super Admin approves or rejects an Edit Request.
    If Approved: requested_values are applied to target entity.
    If Rejected: Changes are discarded.
    """
    if x_actor_role.lower() != models.ActorType.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chain of Command Violation: Only Super Admin can approve Edit Requests."
        )

    result = await db.execute(
        select(models.EditRequest).where(models.EditRequest.id == id)
    )
    edit_req = result.scalars().first()

    if not edit_req:
        raise HTTPException(status_code=404, detail="Edit Request not found.")

    edit_req.decided_at = datetime.now(timezone.utc)
    edit_req.decision_reason = decision.decision_reason
    edit_req.decided_by = UUID(x_actor_id) if x_actor_id else None

    if decision.approved:
        edit_req.status = models.RequestStatus.APPROVED

        # Apply edits dynamically to entity
        updates = edit_req.requested_values
        if edit_req.entity_type == models.EntityType.TEACHER:
            await db.execute(update(models.Teacher).where(models.Teacher.id == edit_req.entity_id).values(**updates))
        elif edit_req.entity_type == models.EntityType.STUDENT:
            await db.execute(update(models.Student).where(models.Student.id == edit_req.entity_id).values(**updates))
        elif edit_req.entity_type == models.EntityType.COURSE:
            await db.execute(update(models.Course).where(models.Course.id == edit_req.entity_id).values(**updates))

        action_logged = models.AuditAction.EDIT_APPROVED
    else:
        edit_req.status = models.RequestStatus.REJECTED
        action_logged = models.AuditAction.EDIT_REJECTED

    await db.commit()
    await db.refresh(edit_req)

    await create_audit_entry(
        db,
        action=action_logged,
        entity_type=edit_req.entity_type,
        entity_id=str(edit_req.entity_id),
        actor_type=models.ActorType.SUPER_ADMIN,
        actor_id=x_actor_id,
        reason=f"Super Admin Decision: {'APPROVED' if decision.approved else 'REJECTED'} - {decision.decision_reason}"
    )

    return edit_req


# ============================================================
# 3. TRASH BIN & SOFT-DELETE RESTORATION
# ============================================================

@router.get("/trash-bin")
async def view_soft_deleted_trash_bin(
    format: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Super Admin view of all soft-deleted records across Teachers, Students, Courses."""
    teachers = (await db.execute(select(models.Teacher).where(models.Teacher.is_deleted == True))).scalars().all()
    students = (await db.execute(select(models.Student).where(models.Student.is_deleted == True))).scalars().all()
    courses = (await db.execute(select(models.Course).where(models.Course.is_deleted == True))).scalars().all()

    if format == "grouped":
        return {
            "soft_deleted_teachers": [{"id": str(t.id), "name": t.name, "email": t.email} for t in teachers],
            "soft_deleted_students": [{"id": str(s.id), "name": s.name, "email": s.email} for s in students],
            "soft_deleted_courses": [{"id": str(c.id), "title": c.title, "code": c.code} for c in courses],
        }

    items = []
    for t in teachers:
        items.append({
            "id": str(t.id),
            "entity_type": "TEACHER",
            "name": t.name,
            "email": t.email,
            "deleted_at": t.updated_at.isoformat() if t.updated_at else None
        })
    for s in students:
        items.append({
            "id": str(s.id),
            "entity_type": "STUDENT",
            "name": s.name,
            "email": s.email,
            "deleted_at": s.updated_at.isoformat() if s.updated_at else None
        })
    for c in courses:
        items.append({
            "id": str(c.id),
            "entity_type": "COURSE",
            "title": c.title,
            "code": c.code,
            "name": f"{c.code} - {c.title}",
            "deleted_at": c.updated_at.isoformat() if c.updated_at else None
        })
    return items


@router.post("/trash-bin/restore")
async def restore_soft_deleted_item(
    entity_type: str,
    entity_id: UUID,
    x_actor_role: str = Header(default="super_admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """Super Admin restores a soft-deleted item back to active state."""
    if x_actor_role.lower() != models.ActorType.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super Admin can restore deleted records.")

    et = models.EntityType(entity_type.lower())
    if et == models.EntityType.TEACHER:
        await db.execute(update(models.Teacher).where(models.Teacher.id == entity_id).values(is_deleted=False))
    elif et == models.EntityType.STUDENT:
        await db.execute(update(models.Student).where(models.Student.id == entity_id).values(is_deleted=False))
    elif et == models.EntityType.COURSE:
        await db.execute(update(models.Course).where(models.Course.id == entity_id).values(is_deleted=False))

    await db.commit()

    await create_audit_entry(
        db,
        action=models.AuditAction.RESTORE,
        entity_type=et,
        entity_id=str(entity_id),
        actor_type=models.ActorType.SUPER_ADMIN,
        actor_id=x_actor_id,
        reason="Super Admin restored item from Trash Bin"
    )

    return {"message": f"Successfully restored {entity_type} {entity_id}"}


# ============================================================
# 4. AUDIT & SECURITY VIEWER
# ============================================================

@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """View immutable system audit logs."""
    result = await db.execute(
        select(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [{
        "id": str(l.id),
        "action": l.action,
        "entity_type": l.entity_type,
        "entity_id": str(l.entity_id) if l.entity_id else None,
        "actor_type": l.actor_type,
        "reason": l.reason,
        "created_at": l.created_at.isoformat() if l.created_at else None
    } for l in logs]


@router.post("/restore/{entity_type}/{entity_id}")
async def restore_item_by_path(
    entity_type: str,
    entity_id: UUID,
    x_actor_role: str = Header(default="super_admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """Direct path restore matching frontend call /api/governance/restore/{type}/{id}."""
    return await restore_soft_deleted_item(
        entity_type=entity_type,
        entity_id=entity_id,
        x_actor_role=x_actor_role,
        x_actor_id=x_actor_id,
        db=db
    )


# ============================================================
# 5. GOVERNANCE ANNOUNCEMENTS
# ============================================================

@router.get("/announcements")
async def list_governance_announcements(db: AsyncSession = Depends(get_db)):
    """List system announcements for governance dashboard."""
    res = await db.execute(select(models.Announcement))
    anns = res.scalars().all()
    return [{
        "id": str(a.id),
        "title": a.title,
        "content": a.content,
        "target": a.target,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in anns]


@router.post("/announcements", status_code=201)
async def create_governance_announcement(
    title: str,
    content: str,
    target: str = "ALL",
    db: AsyncSession = Depends(get_db)
):
    """Publish a system announcement."""
    ann = models.Announcement(
        title=title,
        content=content,
        target=models.AnnouncementTarget(target.upper()),
        status=models.AnnouncementStatus.PUBLISHED
    )
    db.add(ann)
    await db.commit()
    return {"id": str(ann.id), "title": ann.title}

