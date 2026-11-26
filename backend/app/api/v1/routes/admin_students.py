from fastapi import APIRouter, Depends, Query

from app.api.v1.common import ok, page as envelope
from app.core.security import admin
from app.db.session import database
from app.schemas.inputs import AdminStudentCreate, AdminStudentResetPassword, AdminStudentUpdate
from app.services import student_auth

router = APIRouter(tags=["admin_students"], dependencies=[Depends(admin)])


@router.get("/admin/students")
def listing(
    search: str = Query("", max_length=150),
    study_program: str | None = Query(None, max_length=64),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db=Depends(database),
):
    items, total = student_auth.admin_list_students(
        db,
        search=search,
        study_program=study_program,
        page=page,
        page_size=page_size,
    )
    return envelope(items, page, page_size, total)


@router.post("/admin/students", status_code=201)
def create(body: AdminStudentCreate, user=Depends(admin), db=Depends(database, scope="function")):
    return ok(student_auth.admin_create_student(db, body, user))


@router.patch("/admin/students/{student_id}")
def update(
    student_id: int,
    body: AdminStudentUpdate,
    user=Depends(admin),
    db=Depends(database, scope="function"),
):
    return ok(student_auth.admin_update_student(db, student_id, body, user))


@router.post("/admin/students/{student_id}/reset-password")
def reset_password(
    student_id: int,
    body: AdminStudentResetPassword,
    user=Depends(admin),
    db=Depends(database, scope="function"),
):
    return ok(student_auth.admin_reset_password(db, student_id, body, user))
