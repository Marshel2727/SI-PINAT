from fastapi import APIRouter, Depends, Request, Response
from app.db.session import database
from app.core.security import admin, limit
from app.schemas.inputs import AdminPasswordChange, AdminProfileUpdate, Login
from app.services.admin_users import (
    authenticate,
    change_password,
    profile_snapshot,
    update_profile,
)
from app.services.admin_sessions import create
from app.api.v1.common import ok

router = APIRouter(tags=["admin_users"])


@router.post("/auth/login")
def login(body: Login, request: Request, response: Response, db=Depends(database)):
    limit(db, request, "login", 10, 300, body.email.lower())
    return ok(create(db, authenticate(db, body.email, body.password), response))


@router.get("/auth/me")
def me(request: Request, user=Depends(admin), db=Depends(database)):
    return ok(profile_snapshot(db, request, user))


@router.patch("/auth/me")
def patch_me(
    body: AdminProfileUpdate,
    request: Request,
    user=Depends(admin),
    db=Depends(database),
):
    return ok(update_profile(db, request, user, body.full_name))


@router.post("/auth/change-password")
def update_password(
    body: AdminPasswordChange,
    request: Request,
    user=Depends(admin),
    db=Depends(database),
):
    limit(db, request, "change_password", 10, 300, str(user["id"]))
    return ok(change_password(db, request, user, body.current_password, body.new_password))
