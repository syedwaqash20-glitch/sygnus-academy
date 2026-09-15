from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/teachers",
    tags=["Teachers"],
)


@router.post("/", response_model=schemas.TeacherPublicResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    teacher_in: schemas.TeacherCreate, 
    db: AsyncSession = Depends(get_db)
):
    # Check if a teacher with the same email already exists
    result = await db.execute(
        select(models.Teacher).where(models.Teacher.email == teacher_in.email)
    )
    existing_teacher = result.scalars().first()

    if existing_teacher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Teacher with this email already exists."
        )

    new_teacher = models.Teacher(**teacher_in.model_dump())

    db.add(new_teacher)
    await db.commit()
    await db.refresh(new_teacher)

    return new_teacher

# will be moved to admin.py later, as only admin can view all teachers, and not students or visitors
@router.get("/", response_model=List[schemas.TeacherPublicResponse])
async def list_teachers(
    skip: int = 0, 
    limit: int = 50, 
    db: AsyncSession = Depends(get_db)
):
    # Retrieve all active and non-deleted teachers
    result = await db.execute(
        select(models.Teacher)
        .where(models.Teacher.is_deleted == False)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.get("/{id}", response_model=schemas.TeacherPublicResponse)
async def get_teacher(
    id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Teacher).where(models.Teacher.id == id, models.Teacher.is_deleted == False)
    )
    teacher = result.scalars().first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Teacher not found."
        )

    return teacher


@router.put("/{id}", response_model=schemas.TeacherPublicResponse)
async def update_teacher(
    id: UUID, 
    teacher_in: schemas.TeacherCreate, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Teacher).where(models.Teacher.id == id, models.Teacher.is_deleted == False)
    )
    teacher = result.scalars().first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Teacher not found."
        )

    # Update teacher attributes dynamically
    for key, value in teacher_in.model_dump(exclude_unset=True).items():
        setattr(teacher, key, value)

    await db.commit()
    await db.refresh(teacher)

    return teacher


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Teacher).where(models.Teacher.id == id, models.Teacher.is_deleted == False)
    )
    teacher = result.scalars().first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Teacher not found."
        )

    # Soft delete to preserve database integrity
    teacher.is_deleted = True
    await db.commit()

    return {'message' : 'Teacher deleted successfully.'}