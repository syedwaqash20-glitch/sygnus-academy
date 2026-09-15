from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
from database import get_db


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)

# ==============================================
# TEACHER ENDPOINTS
# ==============================================

@router.get("/teachers", response_model=List[schemas.TeacherResponse])
async def list_teachers(
    skip: int = 0, 
    limit: int = 50, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Teacher)
        .where(models.Teacher.is_deleted == False)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())     

@router.get("/teachers/{id}", response_model=schemas.TeacherResponse)
async def get_teacher(
    id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Teacher).where(models.Teacher.id == id)
    )
    teacher = result.scalars().first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Teacher not found."
        )

    return teacher   


@router.put("/teachers/{id}", response_model=schemas.TeacherResponse)
async def update_teacher(
    id: UUID, 
    teacher_in: schemas.TeacherCreate, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Teacher).where(models.Teacher.id == id)
    )
    teacher = result.scalars().first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Teacher not found."
        )

    for key, value in teacher_in.model_dump().items():
        setattr(teacher, key, value)

    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)

    return teacher      


@router.delete("/teachers/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Teacher).where(models.Teacher.id == id)
    )
    teacher = result.scalars().first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Teacher not found."
        )

    teacher.is_deleted = True
    await db.commit()   
    return {"detail": "Teacher marked as deleted."}



# ==============================================
# STUDENT ENDPOINTS
# ==============================================

@router.get("/students", response_model=List[schemas.StudentResponse])
async def list_students(
    skip: int = 0, 
    limit: int = 50, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Student)
        .where(models.Student.is_deleted == False)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()) 

@router.get("/students/{id}", response_model=schemas.StudentResponse)
async def get_student(
    id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Student).where(models.Student.id == id)
    )
    student = result.scalars().first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Student not found."
        )

    return student      

@router.put("/students/{id}", response_model=schemas.StudentResponse)
async def update_student(
    id: UUID, 
    student_in: schemas.StudentCreate, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Student).where(models.Student.id == id)
    )
    student = result.scalars().first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Student not found."
        )

    for key, value in student_in.model_dump().items():
        setattr(student, key, value)

    db.add(student)
    await db.commit()
    await db.refresh(student)

    return student


@router.delete("/students/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    id: UUID, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Student).where(models.Student.id == id)
    )
    student = result.scalars().first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Student not found."
        )

    student.is_deleted = True
    await db.commit()   
    return {"detail": "Student marked as deleted."}



