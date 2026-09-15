# ==============================================================================
# 1. IMPORTS & DEPENDENCIES
# ==============================================================================
import enum
import uuid
from datetime import date, datetime, timezone
from typing import List, Optional

from sqlalchemy import (
    ARRAY,
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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, validates

# Import Enums from schemas (or defined locally below if not present in your schema file)
from schemas import ApprovalStatus, TargetType


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
    specialization_subjects: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    research_publications: Mapped[List[str]] = mapped_column(ARRAY(Text), default=list)
    previous_institutions: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

    # Skills & Focus
    soft_skills: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    hobbies: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    currently_teaching: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    courses_offering: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)

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
    hobbies: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
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
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="CASCADE"), index=True, nullable=False
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