from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    model_validator,
)


# ============================================================================
# COMMON
# ============================================================================

class ORMBaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ADMIN
# ============================================================================

class AdminBase(BaseModel):
    name: str = Field(..., max_length=150)
    email: EmailStr
    is_superadmin: bool = False


class AdminCreate(AdminBase):
    password: str = Field(..., min_length=8)


class AdminUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_superadmin: Optional[bool] = None


class AdminResponse(ORMBaseSchema):
    id: UUID
    name: str
    email: EmailStr
    is_superadmin: bool
    is_active: bool
    created_at: datetime


# ============================================================================
# PLATFORM EXPENSE
# ============================================================================

class PlatformExpenseCreate(BaseModel):
    title: str = Field(..., max_length=200)
    amount: Decimal = Field(..., gt=0)
    category: str = Field(default="OPERATIONAL", max_length=100)
    expense_date: Optional[date] = None
    notes: Optional[str] = None


class PlatformExpenseUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    amount: Optional[Decimal] = Field(None, gt=0)
    category: Optional[str] = Field(None, max_length=100)
    expense_date: Optional[date] = None
    notes: Optional[str] = None


class PlatformExpenseResponse(ORMBaseSchema):
    id: UUID
    title: str
    amount: Decimal
    category: str
    expense_date: date
    notes: Optional[str]
    created_at: datetime


# ============================================================================
# TEACHER
# ============================================================================

class TeacherBase(BaseModel):
    name: str = Field(..., max_length=150)
    email: EmailStr

    address: Optional[str] = None
    gender: Optional[str] = Field(None, max_length=20)
    dob: Optional[date] = None

    phone_number: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    show_phone_number: bool = False

    profile_slug: str = Field(..., max_length=255)

    qualification_latest: str = Field(..., max_length=255)
    degree_pursuing_now: Optional[str] = Field(None, max_length=255)
    secondary_degree: Optional[str] = Field(None, max_length=255)

    specialization_subjects: List[str] = Field(default_factory=list)
    research_publications: List[str] = Field(default_factory=list)
    previous_institutions: List[str] = Field(default_factory=list)

    soft_skills: List[str] = Field(default_factory=list)
    hobbies: List[str] = Field(default_factory=list)

    currently_teaching: List[str] = Field(default_factory=list)
    courses_offering: List[str] = Field(default_factory=list)

    years_of_service_total: int = Field(default=0, ge=0)
    prior_student_count: int = Field(default=0, ge=0)

    default_course_price: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    joined_firm_date: date


class TeacherCreate(TeacherBase):
    pass


class TeacherUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None

    address: Optional[str] = None
    gender: Optional[str] = Field(None, max_length=20)
    dob: Optional[date] = None

    phone_number: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    show_phone_number: Optional[bool] = None

    profile_slug: Optional[str] = Field(None, max_length=255)

    qualification_latest: Optional[str] = Field(None, max_length=255)
    degree_pursuing_now: Optional[str] = Field(None, max_length=255)
    secondary_degree: Optional[str] = Field(None, max_length=255)

    specialization_subjects: Optional[List[str]] = None
    research_publications: Optional[List[str]] = None
    previous_institutions: Optional[List[str]] = None

    soft_skills: Optional[List[str]] = None
    hobbies: Optional[List[str]] = None

    currently_teaching: Optional[List[str]] = None
    courses_offering: Optional[List[str]] = None

    years_of_service_total: Optional[int] = Field(None, ge=0)
    prior_student_count: Optional[int] = Field(None, ge=0)

    default_course_price: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    joined_firm_date: Optional[date] = None

    is_hidden: Optional[bool] = None
    is_deleted: Optional[bool] = None


class TeacherPublicResponse(ORMBaseSchema):
    """
    Safe teacher information for public pages.
    """

    id: UUID
    name: str
    qualification_latest: str

    previous_institutions: List[str]
    currently_teaching: List[str]

    years_of_service_total: int
    profile_slug: str

    research_publications: List[str]
    prior_student_count: int

    specialization_subjects: List[str]

    joined_firm_date: date

    phone_number: Optional[str] = None


class TeacherResponse(TeacherPublicResponse):
    """
    Admin/internal teacher response.
    """

    email: EmailStr

    address: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None

    emergency_contact_number: Optional[str] = None
    show_phone_number: bool

    degree_pursuing_now: Optional[str] = None
    secondary_degree: Optional[str] = None

    soft_skills: List[str]
    hobbies: List[str]
    courses_offering: List[str]

    default_course_price: Optional[Decimal] = None

    is_hidden: bool
    is_deleted: bool

    created_at: datetime
    updated_at: datetime


# ============================================================================
# STUDENT
# ============================================================================

class StudentBase(BaseModel):
    name: str = Field(..., max_length=150)
    email: EmailStr

    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=20)

    current_institution: Optional[str] = None
    show_institution: bool = False

    phone_number: Optional[str] = None
    show_phone_number: bool = False

    emergency_contact: Optional[str] = None
    show_emergency_contact: bool = False

    hobbies: List[str] = Field(default_factory=list)

    payment_per_course: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None

    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=20)

    current_institution: Optional[str] = None
    show_institution: Optional[bool] = None

    phone_number: Optional[str] = None
    show_phone_number: Optional[bool] = None

    emergency_contact: Optional[str] = None
    show_emergency_contact: Optional[bool] = None

    hobbies: Optional[List[str]] = None

    payment_per_course: Optional[Decimal] = Field(
        default=None,
        ge=0,
    )

    is_hidden: Optional[bool] = None
    is_deleted: Optional[bool] = None


class StudentPublicResponse(ORMBaseSchema):
    """
    Public student profile.

    Only fields that are intended to be publicly visible
    should be returned here.
    """

    id: UUID
    name: str
    hobbies: List[str]

    current_institution: Optional[str] = None
    phone_number: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def mask_private_data(cls, values):
        show_institution = (
            getattr(values, "show_institution", False)
            if not isinstance(values, dict)
            else values.get("show_institution", False)
        )

        show_phone = (
            getattr(values, "show_phone_number", False)
            if not isinstance(values, dict)
            else values.get("show_phone_number", False)
        )

        if isinstance(values, dict):
            data = values.copy()
        else:
            data = {
                "id": values.id,
                "name": values.name,
                "hobbies": values.hobbies,
                "current_institution": values.current_institution,
                "phone_number": values.phone_number,
            }

        if not show_institution:
            data["current_institution"] = None

        if not show_phone:
            data["phone_number"] = None

        return data


class StudentResponse(StudentPublicResponse):
    """
    Admin/internal student response.
    """

    email: EmailStr

    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None

    show_institution: bool
    show_phone_number: bool

    emergency_contact: Optional[str] = None
    show_emergency_contact: bool

    payment_per_course: Optional[Decimal] = None

    is_hidden: bool
    is_deleted: bool

    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def do_not_mask_admin_data(cls, values):
        return values


# ============================================================================
# COURSE
# ============================================================================

class CourseBase(BaseModel):
    title: str = Field(..., max_length=200)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None

    price: Decimal = Field(default=Decimal("0.00"), ge=0)

    level: Optional[str] = Field(None, max_length=50)
    duration_hours: Optional[int] = Field(None, gt=0)

    teacher_id: Optional[UUID] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None

    price: Optional[Decimal] = Field(None, ge=0)

    level: Optional[str] = Field(None, max_length=50)
    duration_hours: Optional[int] = Field(None, gt=0)

    teacher_id: Optional[UUID] = None

    is_active: Optional[bool] = None
    is_deleted: Optional[bool] = None


class CourseResponse(ORMBaseSchema):
    id: UUID

    title: str
    code: str
    description: Optional[str]

    price: Decimal
    level: Optional[str]
    duration_hours: Optional[int]

    teacher_id: Optional[UUID]

    is_active: bool
    is_deleted: bool

    created_at: datetime
    updated_at: datetime


# ============================================================================
# ENROLLMENT
# ============================================================================

class EnrollmentCreate(BaseModel):
    student_id: UUID
    course_id: UUID
    teacher_id: Optional[UUID] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None

    notes: Optional[str] = None


class EnrollmentUpdate(BaseModel):
    teacher_id: Optional[UUID] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None
    completion_date: Optional[date] = None

    progress_percentage: Optional[Decimal] = Field(
        None,
        ge=0,
        le=100,
    )

    notes: Optional[str] = None


class EnrollmentResponse(ORMBaseSchema):
    id: UUID

    student_id: UUID
    course_id: UUID
    teacher_id: Optional[UUID]

    status: str

    enrolled_at: datetime

    start_date: Optional[date]
    end_date: Optional[date]
    completion_date: Optional[date]

    progress_percentage: Decimal

    notes: Optional[str]

    created_at: datetime
    updated_at: datetime


# ============================================================================
# ATTENDANCE
# ============================================================================

class AttendanceCreate(BaseModel):
    student_id: UUID
    course_id: UUID
    teacher_id: Optional[UUID] = None

    attendance_date: date
    status: str

    remarks: Optional[str] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None


class AttendanceResponse(ORMBaseSchema):
    id: UUID

    student_id: UUID
    course_id: UUID
    teacher_id: Optional[UUID]

    attendance_date: date
    status: str

    remarks: Optional[str]

    created_at: datetime
    updated_at: datetime


# ============================================================================
# QUIZ RESULT
# ============================================================================

class QuizResultCreate(BaseModel):
    student_id: UUID
    course_id: UUID

    quiz_title: str = Field(..., max_length=200)

    total_marks: Decimal = Field(..., ge=0)
    obtained_marks: Decimal = Field(..., ge=0)

    percentage: Decimal = Field(..., ge=0, le=100)

    quiz_date: date

    external_reference: Optional[str] = Field(
        None,
        max_length=255,
    )

    remarks: Optional[str] = None


class QuizResultUpdate(BaseModel):
    quiz_title: Optional[str] = Field(None, max_length=200)

    total_marks: Optional[Decimal] = Field(None, ge=0)
    obtained_marks: Optional[Decimal] = Field(None, ge=0)

    percentage: Optional[Decimal] = Field(
        None,
        ge=0,
        le=100,
    )

    quiz_date: Optional[date] = None

    external_reference: Optional[str] = Field(
        None,
        max_length=255,
    )

    remarks: Optional[str] = None


class QuizResultResponse(ORMBaseSchema):
    id: UUID

    student_id: UUID
    course_id: UUID

    quiz_title: str

    total_marks: Decimal
    obtained_marks: Decimal
    percentage: Decimal

    quiz_date: date

    external_reference: Optional[str]
    remarks: Optional[str]

    created_at: datetime
    updated_at: datetime


# ============================================================================
# PAYMENT
# ============================================================================

class PaymentCreate(BaseModel):
    student_id: UUID
    teacher_id: Optional[UUID] = None
    course_id: Optional[UUID] = None
    enrollment_id: Optional[UUID] = None

    gross_amount: Decimal = Field(..., gt=0)

    tax_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
    )

    net_amount: Decimal = Field(..., ge=0)

    teacher_earning: Decimal = Field(..., ge=0)

    platform_commission: Decimal = Field(..., ge=0)

    currency: str = Field(default="PKR", max_length=3)
    payment_method: str = Field(default="EASYPAISA", max_length=50)

    transaction_reference: str = Field(..., max_length=100)

    gateway_transaction_id: Optional[str] = Field(
        None,
        max_length=150,
    )


class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    refunded_amount: Optional[Decimal] = Field(None, ge=0)


class PaymentResponse(ORMBaseSchema):
    id: UUID

    student_id: UUID
    teacher_id: Optional[UUID]
    course_id: Optional[UUID]
    enrollment_id: Optional[UUID]

    gross_amount: Decimal
    tax_amount: Decimal
    net_amount: Decimal

    teacher_earning: Decimal
    platform_commission: Decimal
    refunded_amount: Decimal

    currency: str
    payment_method: str

    transaction_reference: str
    gateway_transaction_id: Optional[str]

    status: str
    payment_date: datetime

    year: int
    month: int

    created_at: datetime
    updated_at: datetime


class StudentPaymentResponse(PaymentResponse):
    """
    Payment viewed by a student.

    Includes the student and safe/public teacher information.
    """

    student: StudentResponse
    teacher: Optional[TeacherPublicResponse]


class TeacherPaymentResponse(PaymentResponse):
    """
    Payment viewed by a teacher.

    Includes safe/public student information and teacher information.
    """

    student: StudentPublicResponse
    teacher: Optional[TeacherResponse]


# ============================================================================
# FINANCIAL DASHBOARDS
# ============================================================================

class TeacherDashboardSummary(BaseModel):
    teacher_id: UUID
    teacher_name: str

    total_students: int

    total_earned_net: Decimal
    total_gross_received: Decimal
    total_commission_deducted: Decimal


class AdminFinancialDashboard(BaseModel):
    total_students: int
    total_teachers: int

    total_gross_revenue: Decimal
    total_teacher_payouts: Decimal
    total_platform_revenue: Decimal

    total_expenses: Decimal
    net_profit_loss: Decimal


# ============================================================================
# TESTIMONIAL ENUMS
# ============================================================================

class TargetType(str, Enum):
    TEACHER = "teacher"
    STUDENT = "student"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED_BY_ADMIN = "published_by_admin"


class RecommendLevel(str, Enum):
    HIGHLY_RECOMMENDED = "HIGHLY_RECOMMENDED"
    RECOMMENDED = "RECOMMENDED"
    NEUTRAL = "NEUTRAL"
    NOT_RECOMMENDED = "NOT_RECOMMENDED"


# ============================================================================
# TESTIMONIAL CREATE
# ============================================================================

class TestimonialCreate(BaseModel):
    """
    Generic testimonial creation payload.

    Prefer the specialized schemas below in actual routes.
    """

    recipient_id: UUID
    target_type: TargetType

    course_id: Optional[UUID] = None

    content: str = Field(
        ...,
        max_length=1000,
    )

    rating: Optional[int] = Field(
        None,
        ge=1,
        le=5,
    )

    recommend_level: Optional[RecommendLevel] = None


class StudentTestimonialCreate(BaseModel):
    """
    Student -> Teacher testimonial.
    """

    teacher_id: UUID
    course_id: UUID

    content: str = Field(
        ...,
        max_length=1000,
    )

    rating: int = Field(
        ...,
        ge=1,
        le=5,
    )

    recommend_level: Optional[RecommendLevel] = None


class TeacherTestimonialCreate(BaseModel):
    """
    Teacher -> Student testimonial.
    """

    student_id: UUID

    content: str = Field(
        ...,
        max_length=1000,
    )

    recommend_level: Optional[RecommendLevel] = None


class RecipientDecision(BaseModel):
    """
    Used by the testimonial recipient to approve or reject.
    """

    approve: bool


class AdminTestimonialUpdate(BaseModel):
    content: Optional[str] = Field(
        None,
        max_length=1000,
    )

    rating: Optional[int] = Field(
        None,
        ge=1,
        le=5,
    )

    recommend_level: Optional[RecommendLevel] = None

    status: Optional[ApprovalStatus] = None

    course_id: Optional[UUID] = None

    student_author_id: Optional[UUID] = None
    teacher_author_id: Optional[UUID] = None

    recipient_id: Optional[UUID] = None
    target_type: Optional[TargetType] = None


class TestimonialResponse(ORMBaseSchema):
    id: UUID

    author_type: str

    student_author_id: Optional[UUID]
    teacher_author_id: Optional[UUID]

    recipient_id: Optional[UUID]
    course_id: Optional[UUID]

    title: Optional[str]

    target_type: TargetType

    content: str
    rating: Optional[int]

    recommend_level: Optional[RecommendLevel]

    status: ApprovalStatus

    is_verified_enrollment: bool

    moderation_reason: Optional[str]
    moderated_by_id: Optional[UUID]
    moderated_at: Optional[datetime]

    helpful_count: int
    flagged_count: int

    is_featured: bool
    is_deleted: bool

    created_at: datetime
    updated_at: datetime





# ==================================================================
# super admin


"""
SUPERADMIN / SECURITY API SCHEMAS
=================================

All Pydantic schemas for the SuperAdmin/security system.

These schemas define what the API accepts and returns.

IMPORTANT:
-----------
Database models are NOT API schemas.

For example:

SuperAdmin model:
    password_hash

SuperAdmin response:
    DOES NOT expose password_hash.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import (
    ActorType,
    AuditAction,
    AuditStatus,
    AuthenticationMethod,
    EntityType,
    QuarantineStatus,
    RequestStatus,
    RestrictionType,
    SecuritySeverity,
)


# ============================================================
# 1. SUPER ADMINS
# ============================================================

class SuperAdminBase(BaseModel):
    name: str
    email: EmailStr


class SuperAdminCreate(SuperAdminBase):
    password: str = Field(
        min_length=12,
        max_length=128,
    )


class SuperAdminUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None

    is_active: bool | None = None
    is_locked: bool | None = None

    require_mfa: bool | None = None
    mfa_enabled: bool | None = None


class SuperAdminResponse(SuperAdminBase):
    id: UUID

    is_active: bool
    is_locked: bool

    require_mfa: bool
    mfa_enabled: bool

    last_login_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SUPER ADMIN AUTHENTICATION
# ============================================================

class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str


class SuperAdminMFAVerify(BaseModel):
    session_id: UUID
    code: str


class SuperAdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    requires_mfa: bool


class SuperAdminPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(
        min_length=12,
        max_length=128,
    )


class SuperAdminPasswordResetRequest(BaseModel):
    email: EmailStr


# ============================================================
# 2. SUPER ADMIN SESSIONS
# ============================================================

class SuperAdminSessionResponse(BaseModel):
    id: UUID
    super_admin_id: UUID

    ip_address: str | None
    user_agent: str | None

    is_active: bool

    created_at: datetime
    expires_at: datetime

    revoked_at: datetime | None
    revoke_reason: str | None

    model_config = ConfigDict(from_attributes=True)


class SessionRevokeRequest(BaseModel):
    reason: str = Field(min_length=1)


class ForceLogoutRequest(BaseModel):
    actor_type: ActorType
    actor_id: UUID
    reason: str = Field(min_length=1)


# ============================================================
# 3. REQUEST LOGS
# ============================================================

class RequestLogResponse(BaseModel):
    id: UUID

    request_id: str
    correlation_id: str | None

    actor_type: ActorType
    actor_id: UUID | None

    method: str
    path: str
    route_name: str | None

    query_parameters: dict | None

    ip_address: str | None
    user_agent: str | None

    status_code: int | None
    response_time_ms: float | None

    success: bool
    error_type: str | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 4. AUDIT LOGS
# ============================================================

class AuditLogResponse(BaseModel):
    id: UUID

    request_id: str | None
    correlation_id: str | None
    operation_id: str | None

    actor_type: ActorType
    actor_id: UUID | None

    action: AuditAction

    entity_type: EntityType
    entity_id: UUID | None

    status: AuditStatus

    reason: str | None

    old_values: dict | None
    new_values: dict | None
    changed_fields: dict | None

    metadata_json: dict | None

    ip_address: str | None
    user_agent: str | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 5. AUTHENTICATION EVENTS
# ============================================================

class AuthenticationEventResponse(BaseModel):
    id: UUID

    actor_type: ActorType
    actor_id: UUID | None

    method: AuthenticationMethod | None

    action: str
    success: bool

    ip_address: str | None
    user_agent: str | None

    failure_reason: str | None
    metadata_json: dict | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 6. SECURITY EVENTS
# ============================================================

class SecurityEventResponse(BaseModel):
    id: UUID

    severity: SecuritySeverity

    actor_type: ActorType | None
    actor_id: UUID | None

    event_type: str
    description: str

    ip_address: str | None
    request_id: str | None

    metadata_json: dict | None

    resolved: bool

    resolved_by: UUID | None
    resolved_at: datetime | None
    resolution_reason: str | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityEventResolve(BaseModel):
    resolution_reason: str = Field(min_length=1)


# ============================================================
# 7. DELETION REQUESTS
# ============================================================

class DeletionRequestCreate(BaseModel):
    entity_type: EntityType
    entity_id: UUID

    request_reason: str = Field(
        min_length=1,
        max_length=5000,
    )


class DeletionDecision(BaseModel):
    """
    SuperAdmin decision.
    Accepts both { approved, decision_reason } and { decision, note }.
    """
    approved: Optional[bool] = None
    decision: Optional[str] = None
    decision_reason: Optional[str] = None
    note: Optional[str] = None

    @model_validator(mode="after")
    def normalize_decision(self):
        if self.approved is None:
            if self.decision:
                self.approved = self.decision.strip().lower() in ("approved", "approve", "true", "1")
            else:
                self.approved = False
        if not self.decision_reason:
            self.decision_reason = self.note or ("Approved by Super Admin" if self.approved else "Rejected by Super Admin")
        return self


class DeletionRequestResponse(BaseModel):
    id: UUID

    entity_type: EntityType
    entity_id: UUID

    requested_by_type: ActorType
    requested_by_id: UUID | None

    request_reason: str

    status: RequestStatus

    snapshot: dict | None

    approved_by: UUID | None

    decision_reason: str | None

    decided_at: datetime | None
    executed_at: datetime | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 8. EDIT REQUESTS
# ============================================================

class EditRequestCreate(BaseModel):
    entity_type: EntityType
    entity_id: UUID

    reason: str = Field(
        min_length=1,
        max_length=5000,
    )

    requested_values: dict


class EditDecision(BaseModel):
    approved: Optional[bool] = None
    decision: Optional[str] = None
    decision_reason: Optional[str] = None
    note: Optional[str] = None

    @model_validator(mode="after")
    def normalize_decision(self):
        if self.approved is None:
            if self.decision:
                self.approved = self.decision.strip().lower() in ("approved", "approve", "true", "1")
            else:
                self.approved = False
        if not self.decision_reason:
            self.decision_reason = self.note or ("Approved by Super Admin" if self.approved else "Rejected by Super Admin")
        return self


class EditRequestResponse(BaseModel):
    id: UUID

    entity_type: EntityType
    entity_id: UUID

    requested_by_type: ActorType
    requested_by_id: UUID | None

    reason: str

    old_values: dict | None
    requested_values: dict

    status: RequestStatus

    decided_by: UUID | None
    decision_reason: str | None
    decided_at: datetime | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 9. ACCESS RESTRICTIONS
# ============================================================

class RestrictionCreate(BaseModel):
    actor_type: ActorType
    actor_id: UUID

    restriction_type: RestrictionType

    reason: str = Field(
        min_length=1,
        max_length=5000,
    )

    expires_at: datetime | None = None


class RestrictionRevoke(BaseModel):
    revoke_reason: str = Field(
        min_length=1,
        max_length=5000,
    )


class RestrictionResponse(BaseModel):
    id: UUID

    actor_type: ActorType
    actor_id: UUID

    restriction_type: RestrictionType

    reason: str

    is_active: bool

    created_by: UUID

    expires_at: datetime | None

    created_at: datetime

    revoked_at: datetime | None
    revoked_by: UUID | None
    revoke_reason: str | None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 10. QUARANTINE / DELETED DATA
# ============================================================

class QuarantineRecordResponse(BaseModel):
    id: UUID

    entity_type: EntityType
    entity_id: UUID

    original_filename: str | None
    storage_path: str | None
    file_hash: str | None

    snapshot: dict | None

    deleted_by_type: ActorType
    deleted_by_id: UUID | None

    deletion_reason: str

    deletion_request_id: UUID | None

    request_id: str | None

    ip_address: str | None
    user_agent: str | None

    status: QuarantineStatus

    reviewed_by: UUID | None
    review_reason: str | None
    reviewed_at: datetime | None

    deleted_at: datetime
    permanently_deleted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 11. DATA EXPORT AUDITS
# ============================================================

class DataExportRequest(BaseModel):
    entity_type: EntityType

    reason: str = Field(
        min_length=1,
        max_length=5000,
    )

    filters: dict | None = None


class DataExportAuditResponse(BaseModel):
    id: UUID

    actor_type: ActorType
    actor_id: UUID | None

    entity_type: EntityType

    reason: str

    filters: dict | None

    record_count: int

    ip_address: str | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# SUPER ADMIN DASHBOARD
# ============================================================

class SuperAdminDashboard(BaseModel):
    """
    High-level dashboard information.

    These values would normally be calculated by a service,
    not stored directly in the database.
    """

    total_admins: int
    total_teachers: int
    total_students: int

    active_sessions: int

    pending_deletion_requests: int
    pending_edit_requests: int

    unresolved_security_events: int

    active_restrictions: int

    quarantined_items: int

    recent_failed_logins: int

    recent_audit_events: int