from fastapi import APIRouter, Depends, Request, Response
from app.db.session import database
from app.core.security import admin, limit
from app.schemas.inputs import Login
from app.services.admin_users import authenticate
from app.services.admin_sessions import create
from app.api.v1.common import ok

router=APIRouter(tags=["admin_users"])

@router.post("/auth/login")
def login(body:Login,request:Request,response:Response,db=Depends(database)):
    limit(db,request,"login",10,300,body.email.lower())
    return ok(create(db,authenticate(db,body.email,body.password),response))

@router.get("/auth/me")
def me(user=Depends(admin)):
    return ok({k:user[k] for k in ["id","email","full_name"]})
