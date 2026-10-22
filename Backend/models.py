# ==============================================================================
# 1. IMPORTS & DEPENDENCIES
# ==============================================================================
import enum
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    ARRAY,
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    func,
    select,
)

ListType = ARRAY(String).with_variant(JSON, 'sqlite')
TextListType = ARRAY(Text).with_variant(JSON, 'sqlite')
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, validates

class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class TargetType(str, enum.Enum):
    COURSE = "COURSE"
    TEACHER = "TEACHER"


class ActorType(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    SYSTEM = "system"
    ANONYMOUS = "anonymous"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    RESTORE = "restore"
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET = "password_reset"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    MFA_SUCCESS = "mfa_success"
    MFA_FAILED = "mfa_failed"
    SESSION_CREATED = "session_created"
    SESSION_REVOKED = "session_revoked"
    FORCE_LOGOUT = "force_logout"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    ACCOUNT_ENABLED = "account_enabled"
    ACCOUNT_DISABLED = "account_disabled"
    PERMISSION_CHANGED = "permission_changed"
    ROLE_CHANGED = "role_changed"
    RESTRICTION_CREATED = "restriction_created"
    RESTRICTION_REVOKED = "restriction_revoked"
    DELETE_REQUESTED = "delete_requested"
    DELETE_APPROVED = "delete_approved"
    DELETE_REJECTED = "delete_rejected"
    DELETE_EXECUTED = "delete_executed"
    EDIT_REQUESTED = "edit_requested"
    EDIT_APPROVED = "edit_approved"
    EDIT_REJECTED = "edit_rejected"
    DATA_EXPORTED = "data_exported"
    SECURITY_EVENT = "security_event"
    SYSTEM_SETTING_CHANGED = "system_setting_changed"
    BULK_OPERATION = "bulk_operation"


class AuditStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    REJECTED = "rejected"
    APPROVED = "approved"


class AuthenticationMethod(str, enum.Enum):
    PASSWORD = "password"
    MFA = "mfa"
    SESSION = "session"
    PASSWORD_RESET = "password_reset"
    API_KEY = "api_key"


class EntityType(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"
    SUPER_ADMIN = "super_admin"
    COURSE = "course"
    ENROLLMENT = "enrollment"
    ATTENDANCE = "attendance"
    QUIZ_RESULT = "quiz_result"
    PAYMENT = "payment"
    REFUND = "refund"
    PAYOUT = "payout"
    EXPENSE = "expense"
    TESTIMONIAL = "testimonial"
    ANNOUNCEMENT = "announcement"
    DOCUMENT = "document"
    FILE = "file"
    SYSTEM_SETTING = "system_setting"
    ROLE = "role"
    PERMISSION = "permission"
    OTHER = "other"


class SecuritySeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"
    CANCELLED = "cancelled"


class RestrictionType(str, enum.Enum):
    ACCOUNT_LOCK = "account_lock"
    LOGIN_BLOCK = "login_block"
    READ_ONLY = "read_only"
    SUSPENSION = "suspension"
    API_BLOCK = "api_block"
    FULL_ACCESS_BLOCK = "full_access_block"


class QuarantineStatus(str, enum.Enum):
    QUARANTINED = "quarantined"
    PENDING_REVIEW = "pending_review"
    RESTORED = "restored"
    APPROVED_FOR_DELETION = "approved_for_deletion"
    PERMANENTLY_DELETED = "permanently_deleted"


# ==============================================================================
# 2. ENUM DEFINITIONS FOR TESTIMONIALS
# ==============================================================================
class AuthorType(str, enum.Enum):
    """Defines the role category of the testimonial author."""
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ALUMNI = "ALUMNI"
    PARENT = "PARENT"


class RecommendLevel(str, enum.Enum):
    """Defines qualitative recommendation tiers."""
    HIGHLY_RECOMMENDED = "HIGHLY_RECOMMENDED"
    RECOMMENDED = "RECOMMENDED"
    NEUTRAL = "NEUTRAL"
    NOT_RECOMMENDED = "NOT_RECOMMENDED"


# ==============================================================================
# 3. BASE DECLARATION & ASSOCIATION TABLES
# ==============================================================================
class Base(DeclarativeBase):
    """Root declarative base class for SQLAlchemy ORM models."""
    pass


# Association Table: Student to Course Enrollment (Many-to-Many)
student_course_enrollment = Table(
    "student_course_enrollment",
    Base.metadata,
    Column("student_id", UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True),
    Column("course_id", UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True),
    Column("enrolled_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)


# ==============================================================================
# 4. ADMIN & SYSTEM MODELS
# ==============================================================================
class Admin(Base):
    """Platform Administrator entity for access control and permissions."""
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    can_manage_teachers: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_manage_students: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_manage_listings: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_update_announcements: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class SystemSetting(Base):
    """Global system configuration settings key-value store."""
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    maintenance_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    global_announcement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PlatformExpense(Base):
    """Financial tracking entity for operational platform expenses."""
    __tablename__ = "platform_expenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="OPERATIONAL", nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# ==============================================================================
# 5. CORE ENTITY MODELS (TEACHER, COURSE, STUDENT)
# ==============================================================================
class Teacher(Base):
    """Enterprise Teacher entity representing platform instructors."""
    __tablename__ = "teachers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Personal Information
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Contact & Emergency Details
    phone_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    emergency_contact_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    show_phone_number: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Profile & Media
    profile_slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Educational Background
    qualification_latest: Mapped[str] = mapped_column(String(255), nullable=False)
    degree_pursuing_now: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    secondary_degree: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    specialization_subjects: Mapped[List[str]] = mapped_column(ListType, default=list)
    research_publications: Mapped[List[str]] = mapped_column(TextListType, default=list)
    previous_institutions: Mapped[List[str]] = mapped_column(ListType, default=list)

    # Skills & Focus
    soft_skills: Mapped[List[str]] = mapped_column(ListType, default=list)
    hobbies: Mapped[List[str]] = mapped_column(ListType, default=list)
    currently_teaching: Mapped[List[str]] = mapped_column(ListType, default=list)
    courses_offering: Mapped[List[str]] = mapped_column(ListType, default=list)

    # Metrics & Pricing Defaults
    years_of_service_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prior_student_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    default_course_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True, default=0.00)
    payment_received: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.00)

    # System Status & Audit Metadata
    joined_firm_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    courses: Mapped[List["Course"]] = relationship("Course", back_populates="teacher", cascade="all, delete-orphan")
    payments_received: Mapped[List["StudentPayment"]] = relationship("StudentPayment", back_populates="teacher")

    __table_args__ = (
        Index("idx_teacher_active_status", "is_deleted", "is_hidden"),
    )


class Course(Base):
    """Enterprise Course entity for managing academic offerings."""
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.00)

    subject: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    duration_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="SET NULL"), index=True, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="courses")
    students: Mapped[List["Student"]] = relationship(
        "Student", secondary=student_course_enrollment, back_populates="courses"
    )
    payments: Mapped[List["StudentPayment"]] = relationship("StudentPayment", back_populates="course")

    # Dynamic Computed Property
    @hybrid_property
    def students_count(self) -> int:
        return len(self.students)

    @students_count.expression
    def students_count(cls):
        return (
            select(func.count(student_course_enrollment.c.student_id))
            .where(student_course_enrollment.c.course_id == cls.id)
            .label("students_count")
        )

    __table_args__ = (
        Index("idx_course_catalog", "is_active", "is_deleted"),
    )


class Student(Base):
    """Enterprise Student entity representing platform learners."""
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Personal Information
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Institution & Visibility
    current_institution: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    show_institution: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Contact & Visibility
    phone_number: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    show_phone_number: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    show_emergency_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Preferences & Financial Overrides
    hobbies: Mapped[List[str]] = mapped_column(ListType, default=list)
    payment_per_course: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True, default=0.00)

    # Soft Delete & System Flags
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    courses: Mapped[List["Course"]] = relationship(
        "Course", secondary=student_course_enrollment, back_populates="students"
    )
    payments: Mapped[List["StudentPayment"]] = relationship(
        "StudentPayment", back_populates="student", cascade="all, delete-orphan"
    )











# =======================================================================
# 6. TRANSACTIONS & TESTIMONIALS
# =======================================================================



class StudentPayment(Base):
    """Enterprise ledger model tracking transactions and revenue distribution."""
    __tablename__ = "student_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    course_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), index=True, nullable=True
    )

    gross_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tax_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.00)
    net_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    teacher_earning: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    platform_commission: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    refunded_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.00)

    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="PKR")
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="EASYPAISA")
    transaction_reference: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    gateway_transaction_id: Mapped[Optional[str]] = mapped_column(String(150), unique=True, index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="COMPLETED", index=True)

    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="payments")
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="payments_received")
    course: Mapped[Optional["Course"]] = relationship("Course", back_populates="payments")

    @validates("payment_date")
    def auto_set_year_month(self, key, value):
        if value:
            self.year = value.year
            self.month = value.month
        return value

    __table_args__ = (
        Index("idx_student_payment_period", "student_id", "year", "month"),
        Index("idx_teacher_payout_period", "teacher_id", "status", "year", "month"),
        Index("idx_course_revenue", "course_id", "status"),
        CheckConstraint("gross_amount >= 0", name="check_positive_gross_amount"),
        CheckConstraint(
            "teacher_earning + platform_commission <= gross_amount",
            name="check_earning_split_validity",
        ),
    )


class Testimonial(Base):
    """Enterprise Testimonial entity for user reviews and social proof."""
    __tablename__ = "testimonials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    author_type: Mapped[AuthorType] = mapped_column(
        SQLEnum(AuthorType), default=AuthorType.STUDENT, nullable=False
    )

    target_type: Mapped[TargetType] = mapped_column(
        SQLEnum(TargetType), nullable=False, index=True
    )
    recipient_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="SET NULL"), index=True, nullable=True
    )
    course_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), index=True, nullable=True
    )

    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    recommend_level: Mapped[Optional[RecommendLevel]] = mapped_column(
        SQLEnum(RecommendLevel), nullable=True
    )

    status: Mapped[ApprovalStatus] = mapped_column(
        SQLEnum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False, index=True
    )
    is_verified_enrollment: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    moderation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    moderated_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flagged_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    author: Mapped["Student"] = relationship("Student", foreign_keys=[author_id])
    recipient: Mapped[Optional["Teacher"]] = relationship("Teacher", foreign_keys=[recipient_id])
    course: Mapped[Optional["Course"]] = relationship("Course", foreign_keys=[course_id])

    __table_args__ = (
        CheckConstraint(
            "rating IS NULL OR (rating >= 1 AND rating <= 5)",
            name="check_valid_rating_range",
        ),
        Index("idx_testimonial_course_feed", "course_id", "status", "is_deleted"),
        Index("idx_testimonial_teacher_feed", "recipient_id", "status", "is_deleted"),
        Index("idx_testimonial_featured", "is_featured", "status", "is_deleted"),
    )


# ==============================================================================
# 7. GOVERNANCE & APPROVAL WORKFLOW MODELS
# ==============================================================================

class SuperAdmin(Base):
    """The ultimate governance security authority in the chain of command."""
    __tablename__ = "super_admins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class DeletionRequest(Base):
    """Soft deletion approval workflow entity."""
    __tablename__ = "deletion_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[EntityType] = mapped_column(SQLEnum(EntityType), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    requested_by_type: Mapped[ActorType] = mapped_column(SQLEnum(ActorType), nullable=False)
    requested_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    request_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RequestStatus] = mapped_column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False, index=True)
    snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class EditRequest(Base):
    """Sensitive record edit request approval workflow entity."""
    __tablename__ = "edit_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[EntityType] = mapped_column(SQLEnum(EntityType), nullable=False, index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    requested_by_type: Mapped[ActorType] = mapped_column(SQLEnum(ActorType), nullable=False)
    requested_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    requested_values: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[RequestStatus] = mapped_column(SQLEnum(RequestStatus), default=RequestStatus.PENDING, nullable=False, index=True)
    decided_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    """Immutable audit log tracking every operation."""
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    actor_type: Mapped[ActorType] = mapped_column(SQLEnum(ActorType), nullable=False)
    actor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action: Mapped[AuditAction] = mapped_column(SQLEnum(AuditAction), nullable=False)
    entity_type: Mapped[EntityType] = mapped_column(SQLEnum(EntityType), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[AuditStatus] = mapped_column(SQLEnum(AuditStatus), default=AuditStatus.SUCCESS, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class QuarantineRecord(Base):
    """Quarantine vault for soft-deleted records."""
    __tablename__ = "quarantine_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[EntityType] = mapped_column(SQLEnum(EntityType), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    deleted_by_type: Mapped[ActorType] = mapped_column(SQLEnum(ActorType), nullable=False)
    deleted_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    deletion_reason: Mapped[str] = mapped_column(Text, nullable=False)
    deletion_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[QuarantineStatus] = mapped_column(SQLEnum(QuarantineStatus), default=QuarantineStatus.QUARANTINED, nullable=False)
    deleted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SecurityEvent(Base):
    """Security alert tracking entity."""
    __tablename__ = "security_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    severity: Mapped[SecuritySeverity] = mapped_column(SQLEnum(SecuritySeverity), default=SecuritySeverity.LOW, nullable=False)
    actor_type: Mapped[Optional[ActorType]] = mapped_column(SQLEnum(ActorType), nullable=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AnnouncementTarget(str, enum.Enum):
    ALL = "ALL"
    STUDENTS = "STUDENTS"
    TEACHERS = "TEACHERS"
    ADMINS = "ADMINS"


class AnnouncementStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class Announcement(Base):
    """Platform Announcement entity."""
    __tablename__ = "announcements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    target: Mapped[AnnouncementTarget] = mapped_column(SQLEnum(AnnouncementTarget), default=AnnouncementTarget.ALL, nullable=False)
    status: Mapped[AnnouncementStatus] = mapped_column(SQLEnum(AnnouncementStatus), default=AnnouncementStatus.PUBLISHED, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class QuizResult(Base):
    """Student Quiz Performance record."""
    __tablename__ = "quiz_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    quiz_title: Mapped[str] = mapped_column(String(200), nullable=False)
    score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    total_marks: Mapped[float] = mapped_column(Numeric(5, 2), default=100.0, nullable=False)
    percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PASSED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)