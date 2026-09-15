from datetime import datetime, date
from typing import List, Optional, Any
from decimal import Decimal
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator

# Admin Schemas
class AdminBase(BaseModel):
    name: str = Field(..., max_length=150)
    email: EmailStr
    can_manage_teachers: bool = True
    can_manage_students: bool = True
    can_manage_listings: bool = True
    can_update_announcements: bool = False
    is_superadmin: bool = False

class AdminCreate(AdminBase):
    password: str = Field(..., min_length=8)

class AdminResponse(AdminBase):
    id: UUID
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Expense Schema
class PlatformExpenseCreate(BaseModel):
    title: str = Field(..., max_length=200)
    amount: Decimal = Field(..., gt=0)
    category: str = "OPERATIONAL"
    expense_date: Optional[date] = None
    notes: Optional[str] = None

class PlatformExpenseResponse(PlatformExpenseCreate):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Teacher Schemas
class TeacherBase(BaseModel):
    name: str = Field(..., max_length=150)
    qualification_latest: str
    previous_institutions: List[str] = []
    currently_teaching: Optional[str] = None
    years_of_service_total: int = 0
    profile_slug: str
    research_publications: List[str] = []
    prior_students_count: int = 0
    email: EmailStr
    phone_number: Optional[str] = None
    show_phone_number: bool = False
    specialization_subjects: List[str] = []
    joined_firm_date: date

class TeacherCreate(TeacherBase):
    dob: Optional[date] = None

# Public response (for visitors, students)
class TeacherPublicResponse(BaseModel):
    id: UUID
    name: str
    qualification_latest: str
    previous_institutions: List[str]
    currently_teaching: Optional[str]
    years_of_service_total: int
    profile_slug: str
    research_publications: List[str]
    prior_students_count: int
    specialization_subjects: List[str]
    joined_firm_date: date
    phone_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Admin response (for dashboard management)
class TeacherResponse(TeacherPublicResponse):
    email: EmailStr
    dob: Optional[date] = None
    show_phone_number: bool
    is_active: bool
    is_hidden: bool
    is_deleted: bool
    created_at: datetime


# Student Schemas
class StudentBase(BaseModel):
    name: str = Field(..., max_length=150)
    email: EmailStr
    address: Optional[str] = None
    dob: Optional[date] = None
    current_institution: Optional[str] = None
    show_institution: bool = False
    phone_number: Optional[str] = None
    show_phone_number: bool = False
    emergency_contact: Optional[str] = None
    show_emergency_contact: bool = False
    hobbies: List[str] = []

class StudentCreate(StudentBase):
    pass

# Public View (For directory / public searches)
class StudentPublicResponse(BaseModel):
    id: UUID
    name: str
    hobbies: List[str]
    current_institution: Optional[str] = None
    phone_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    def mask_private_data(cls, values: Any) -> Any:
        # Prevent direct mutation of ORM attributes in active DB sessions
        show_inst = getattr(values, "show_institution", True) if not isinstance(values, dict) else values.get("show_institution", True)
        show_phone = getattr(values, "show_phone_number", True) if not isinstance(values, dict) else values.get("show_phone_number", True)

        if not show_inst or not show_phone:
            if isinstance(values, dict):
                data = values.copy()
            else:
                data = {c.name: getattr(values, c.name) for c in values.__table__.columns}

            if not show_inst:
                data["current_institution"] = None
            if not show_phone:
                data["phone_number"] = None
            return data

        return values


# Admin / Internal View (Extends StudentPublicResponse to add sensitive fields)
class StudentResponse(StudentPublicResponse):
    email: EmailStr
    address: Optional[str] = None
    dob: Optional[date] = None
    emergency_contact: Optional[str] = None
    show_institution: bool
    show_phone_number: bool
    show_emergency_contact: bool
    is_active: bool = True
    is_hidden: bool = False
    is_deleted: bool = False
    created_at: datetime

    # Override validator so admins always see unmasked institutional & phone data
    @model_validator(mode="before")
    def mask_private_data(cls, values: Any) -> Any:
        return values





# Payment & Financial Schemas
class PaymentCreate(BaseModel):
    student_id: UUID
    teacher_id: UUID
    course_id: Optional[UUID] = None
    gross_amount: Decimal = Field(..., gt=0)
    transaction_reference: str

class PaymentResponse(BaseModel):
    id: UUID
    student_id: UUID
    teacher_id: UUID
    course_id: Optional[UUID]
    gross_amount: Decimal
    teacher_earning: Decimal
    platform_commission: Decimal
    payment_date: datetime
    transaction_reference: str
    status: str
    model_config = ConfigDict(from_attributes=True)

#teacher payment response
class StudentPaymentResponse(PaymentResponse):
    student: StudentResponse
    teacher: TeacherPublicResponse
    model_config = ConfigDict(from_attributes=True)

#student payment response
class TeacherPaymentResponse(PaymentResponse):
    student: StudentPublicResponse
    teacher: TeacherResponse
    model_config = ConfigDict(from_attributes=True)


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










# ============================================================
# =======================Testimonials=========================

# ---------------------------------------------------------
# ENUMS
# ---------------------------------------------------------

class TargetType(str, Enum):
    TEACHER = "teacher"  # Student -> Teacher (display on Course page)
    STUDENT = "student"  # Teacher -> Student (display on Student profile)

class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED_BY_ADMIN = "published_by_admin"

# ---------------------------------------------------------
# INPUT SCHEMAS
# ---------------------------------------------------------

# Generic / Unified Create Schema
class TestimonialCreate(BaseModel):
    recipient_id: UUID
    target_type: TargetType
    course_id: Optional[UUID] = None  # Mandatory if target_type == TargetType.TEACHER
    content: str = Field(..., max_length=1000, description="Testimonial body text")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating between 1 and 5")
    recommend_level: Optional[str] = Field(None, max_length=100)

# Student writing for Teacher / Course
class StudentTestimonialCreate(BaseModel):
    teacher_id: UUID
    course_id: UUID
    content: str = Field(..., max_length=1000)
    rating: int = Field(..., ge=1, le=5)
    recommend_level: Optional[str] = Field(None, max_length=100)

# Teacher writing for Student
class TeacherTestimonialCreate(BaseModel):
    student_id: UUID
    content: str = Field(..., max_length=1000)
    recommend_level: Optional[str] = Field(None, max_length=100)

# Recipient Action (Approve / Reject)
class RecipientDecision(BaseModel):
    approve: bool  # True -> APPROVED, False -> REJECTED

# Admin Update Payload
class AdminTestimonialUpdate(BaseModel):
    content: Optional[str] = Field(None, max_length=1000)
    rating: Optional[int] = Field(None, ge=1, le=5)
    recommend_level: Optional[str] = Field(None, max_length=100)
    status: Optional[ApprovalStatus] = None
    course_id: Optional[UUID] = None
    author_id: Optional[UUID] = None
    recipient_id: Optional[UUID] = None
    target_type: Optional[TargetType] = None

# ---------------------------------------------------------
# RESPONSE SCHEMAS
# ---------------------------------------------------------

class TestimonialResponse(BaseModel):
    id: UUID
    author_id: UUID
    recipient_id: UUID
    course_id: Optional[UUID] = None
    target_type: TargetType
    content: str
    rating: Optional[int] = None
    recommend_level: Optional[str] = None
    status: ApprovalStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ===============================================================
# ===============================================================
 