from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/students",
    tags=["Students"],
)

@router.post("/", response_model=schemas.StudentPublicResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_in: schemas.StudentCreate, 
    db: AsyncSession = Depends(get_db)
):
    
    # Check if a student with the same email already exists
    result = await db.execute(
        select(models.Student).where(models.Student.email == student_in.email)
    )
    existing_student = result.scalars().first()

    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Student with this email already exists."
        )

    new_student = models.Student(**student_in.model_dump())

    db.add(new_student)
    await db.commit()
    await db.refresh(new_student)

    return new_student


@router.get("/{id}", response_model=schemas.StudentPublicResponse, status_code=status.HTTP_200_OK)
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


@router.put("/{id}", response_model=schemas.StudentPublicResponse, status_code=status.HTTP_200_OK)
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

    await db.commit()
    await db.refresh(student)

    return student

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
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

    await db.delete(student)
    await db.commit()

    return {"detail": "Student deleted successfully."}