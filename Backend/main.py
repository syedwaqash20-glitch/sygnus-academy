from contextlib import asynccontextmanager
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func

from database import engine, Base, AsyncSessionLocal
import models
from routes import teachers, students, admin, governance, super_admin, courses

async def seed_initial_data():
    """Seed sample data across all tables so every model/table is in use."""
    async with AsyncSessionLocal() as db:
        # Check if SuperAdmin exists
        sa_check = (await db.execute(select(models.SuperAdmin))).scalars().first()
        if not sa_check:
            sa = models.SuperAdmin(
                name="Apex Super Admin",
                email="superadmin@sygnus.edu",
                password_hash="hashed_SuperAdmin123!",
                is_active=True,
                is_locked=False
            )
            db.add(sa)
            await db.flush()

            # Seed Admins
            admin1 = models.Admin(name="Sarah Connor (Admin)", email="sarah.admin@sygnus.edu", password_hash="hash_admin", is_superadmin=False)
            admin2 = models.Admin(name="Marcus Vance (Admin)", email="marcus.admin@sygnus.edu", password_hash="hash_admin", is_superadmin=False)
            db.add_all([admin1, admin2])
            await db.flush()

            # Seed Teachers
            t1 = models.Teacher(name="Dr. Alan Turing", profile_slug="dr-alan-turing", email="alan.turing@sygnus.edu", bio="Computer Science Pioneer & AI Researcher", qualification_latest="Ph.D. Computer Science")
            t2 = models.Teacher(name="Dr. Marie Curie", profile_slug="dr-marie-curie", email="marie.curie@sygnus.edu", bio="Nobel Laureate in Physics & Chemistry", qualification_latest="Ph.D. Quantum Physics")
            db.add_all([t1, t2])
            await db.flush()

            # Seed Students
            s1 = models.Student(name="Alice Johnson", email="alice.student@sygnus.edu")
            s2 = models.Student(name="Bob Smith", email="bob.student@sygnus.edu")
            db.add_all([s1, s2])
            await db.flush()

            # Seed Courses
            c1 = models.Course(title="Advanced AI & Governance Architecture", code="CS-901", description="Mastering Enterprise AI Models & Audit Controls", price=299.99, subject="Artificial Intelligence")
            c2 = models.Course(title="Quantum Physics Fundamentals", code="PHY-402", description="Introduction to Quantum Mechanics & Entanglement", price=249.99, subject="Physics")
            db.add_all([c1, c2])
            await db.flush()

            # Seed Sample Deletion Request (Pending Super Admin Approval)
            del_req = models.DeletionRequest(
                entity_type=models.EntityType.COURSE,
                entity_id=c2.id,
                requested_by_type=models.ActorType.ADMIN,
                requested_by_id=admin1.id,
                request_reason="Legacy course requested for deprecation by Admin Sarah",
                status=models.RequestStatus.PENDING,
                snapshot={"title": c2.title, "code": c2.code}
            )
            db.add(del_req)

            # Seed Sample Edit Request (Pending Super Admin Approval)
            edit_req = models.EditRequest(
                entity_type=models.EntityType.TEACHER,
                entity_id=t1.id,
                requested_by_type=models.ActorType.TEACHER,
                requested_by_id=t1.id,
                reason="Teacher requested update of bio and title to Distinguished Professor",
                old_values={"qualification_latest": t1.qualification_latest},
                requested_values={"qualification_latest": "Distinguished Ph.D. Fellow"},
                status=models.RequestStatus.PENDING
            )
            db.add(edit_req)

            # Seed Announcement
            ann = models.Announcement(
                title="Welcome to Sygnus Academia Governance Platform",
                content="All sensitive operations, edits, and deletions require Super Admin approval under strictly enforced chain of command.",
                target=models.AnnouncementTarget.ALL,
                status=models.AnnouncementStatus.PUBLISHED
            )
            db.add(ann)

            # Seed Audit Log
            audit = models.AuditLog(
                request_id="req_system_init",
                actor_type=models.ActorType.SYSTEM,
                action=models.AuditAction.CREATE,
                entity_type=models.EntityType.SUPER_ADMIN,
                entity_id=str(sa.id),
                status=models.AuditStatus.SUCCESS,
                reason="System Initialization & Database Seeding Completed",
                ip_address="127.0.0.1"
            )
            db.add(audit)

            await db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables & seed initial data
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_initial_data()
    yield
    # Shutdown
    await engine.dispose()

from middleware.governance import SecurityHeadersMiddleware

app = FastAPI(
    title="Sygnus Academia Enterprise Governance API",
    description="Multi-tier Role Hierarchy (Super Admin -> Admin -> Teacher -> Student) with Soft Deletion & Super Admin Approval Matrix.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Enable CORS for Frontend SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Feature Routers
app.include_router(super_admin.router)
app.include_router(admin.router)
app.include_router(teachers.router)
app.include_router(students.router)
app.include_router(governance.router)
app.include_router(courses.router)

from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dir = Path(__file__).resolve().parent.parent / "Frontend"
if frontend_dir.exists():
    app.mount("/app", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

@app.get("/")
async def root_status():
    return {
        "platform": "Sygnus Academia Governance Platform API",
        "status": "ONLINE",
        "chain_of_command": "Super Admin -> Admin -> Teacher -> Student",
        "governance": "Soft-delete only; All edits/deletions pending Super Admin approval",
        "frontend_portal": "/app/"
    }