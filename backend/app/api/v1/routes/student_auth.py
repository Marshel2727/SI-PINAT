from fastapi import APIRouter, Depends, Request, Response

from app.api.v1.common import ok
from app.core.security import limit, student_user
from app.db.session import database
from app.schemas.inputs import StudentLogin, StudentRegister
from app.services import student_auth

router = APIRouter(tags=["student_auth"])


@router.post("/student-auth/register", status_code=201)
def register(body: StudentRegister, response: Response, db=Depends(database, scope="function")):
    return ok(student_auth.register(db, body, response))


@router.post("/student-auth/login")
def login(body: StudentLogin, request: Request, response: Response, db=Depends(database, scope="function")):
    limit(db, request, "student_login", 10, 300, body.nim)
    return ok(student_auth.login(db, body, response))


@router.post("/student-auth/logout")
def logout(request: Request, response: Response, db=Depends(database, scope="function")):
    return ok(student_auth.logout(db, request, response))


@router.get("/student-auth/me")
def me(student=Depends(student_user), db=Depends(database)):
    return ok(student_auth.me(db, student))
