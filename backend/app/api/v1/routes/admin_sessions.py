from fastapi import APIRouter, Depends, Request, Response
from app.db.session import database
from app.core.security import admin, issue_csrf, cookie
from app.services.admin_sessions import revoke

router=APIRouter(tags=["admin_sessions"])

@router.get("/auth/csrf")
def token(response:Response):
    value=issue_csrf()
    cookie(response,"sipinat_csrf",value,hours=2,http_only=True)
    response.headers["Cache-Control"]="no-store"
    return {"data":{"csrf_token":value}}

@router.post("/auth/logout",status_code=204)
def logout(request:Request,response:Response,user=Depends(admin),db=Depends(database)):
    revoke(db,request,user,response)
    response.status_code=204
