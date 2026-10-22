from uuid import UUID, uuid4
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
from database import get_db
from middleware.governance import create_audit_entry

router = APIRouter(
    prefix="/api/courses",
    tags=["Courses & Academic Core"],
)

# ============================================================
# 1. COURSES MANAGEMENT
# ============================================================

@router.get("/")
async def list_courses(db: AsyncSession = Depends(get_db)):
    """List all active courses."""
    result = await db.execute(
        select(models.Course).where(models.Course.is_deleted == False)
    )
    courses = result.scalars().all()
    return [{
        "id": str(c.id),
        "title": c.title,
        "code": c.code,
        "description": c.description,
        "price": float(c.price or 0),
        "is_active": c.is_active,
        "level": c.level,
        "subject": c.subject
    } for c in courses]


@router.post("/", status_code=201)
async def create_course(
    title: str,
    code: str,
    description: str = "",
    price: float = 199.99,
    subject: str = "Computer Science",
    x_actor_role: str = Header(default="admin"),
    x_actor_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db)
):
    """Admin or Teacher creates a course."""
    new_course = models.Course(
        title=title,
        code=code,
        description=description,
        price=price,
        subject=subject,
        is_active=True
    )
    db.add(new_course)
    await db.commit()
    await db.refresh(new_course)

    await create_audit_entry(
        db,
        action=models.AuditAction.CREATE,
        entity_type=models.EntityType.COURSE,
        entity_id=str(new_course.id),
        actor_type=models.ActorType(x_actor_role.lower()),
        actor_id=x_actor_id,
        reason=f"Created Course {title} ({code})"
    )

    return {"id": str(new_course.id), "title": new_course.title, "code": new_course.code}


# ============================================================
# 2. ENROLLMENTS & QUIZ RESULTS
# ============================================================

@router.post("/{course_id}/enroll")
async def enroll_student(
    course_id: UUID,
    student_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Enroll a student in a course and log transaction record."""
    course = (await db.execute(select(models.Course).where(models.Course.id == course_id))).scalars().first()
    student = (await db.execute(select(models.Student).where(models.Student.id == student_id))).scalars().first()
    
    if not course or not student:
        raise HTTPException(status_code=404, detail="Course or Student not found.")

    # Create StudentPayment financial ledger entry
    teacher_id = course.teacher_id
    if not teacher_id:
        first_t = (await db.execute(select(models.Teacher))).scalars().first()
        if first_t:
            teacher_id = first_t.id

    price_val = float(course.price or 199.99)
    payment = models.StudentPayment(
        student_id=student.id,
        teacher_id=teacher_id,
        course_id=course.id,
        gross_amount=price_val,
        net_amount=round(price_val * 0.8, 2),
        teacher_earning=round(price_val * 0.7, 2),
        platform_commission=round(price_val * 0.1, 2),
        currency="USD",
        payment_method="CREDIT_CARD",
        transaction_reference=f"TXN-{uuid4().hex[:8].upper()}",
        status="COMPLETED",
        year=datetime.now().year,
        month=datetime.now().month
    )
    db.add(payment)
    await db.commit()

    return {"message": f"Successfully enrolled student {student.name} in {course.title}", "payment_ref": payment.transaction_reference}


@router.post("/{course_id}/quiz-result")
async def record_quiz_result(
    course_id: UUID,
    student_id: UUID,
    quiz_title: str,
    score: float,
    total_marks: float = 100.0,
    db: AsyncSession = Depends(get_db)
):
    """Teacher or Student records a Quiz Result."""
    qr = models.QuizResult(
        course_id=course_id,
        student_id=student_id,
        quiz_title=quiz_title,
        score=score,
        total_marks=total_marks,
        percentage=(score / total_marks) * 100 if total_marks > 0 else 0,
        status="PASSED" if score >= (total_marks * 0.5) else "FAILED"
    )
    db.add(qr)
    await db.commit()
    return {"id": str(qr.id), "status": qr.status, "percentage": qr.percentage}


# ============================================================
# 3. ANNOUNCEMENTS & DOCUMENTS
# ============================================================

@router.get("/announcements")
async def list_announcements(db: AsyncSession = Depends(get_db)):
    """List system & course announcements."""
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
async def create_announcement(
    title: str,
    content: str,
    target: str = "ALL",
    db: AsyncSession = Depends(get_db)
):
    """Post an announcement."""
    ann = models.Announcement(
        title=title,
        content=content,
        target=models.AnnouncementTarget(target.upper()),
        status=models.AnnouncementStatus.PUBLISHED
    )
    db.add(ann)
    await db.commit()
    return {"id": str(ann.id), "title": ann.title}
