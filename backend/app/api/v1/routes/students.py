from fastapi import APIRouter, Depends, Request
from app.db.session import database
from app.core.security import owned
from app.schemas.inputs import Profile
from app.services.assessments import profile
from app.api.v1.common import ok

router=APIRouter(tags=["students"])

@router.patch("/assessments/{public_id}/profile")
def edit(public_id:str,body:Profile,request:Request,db=Depends(database)):
    return ok(profile(db,owned(db,request,public_id,lock=True),body))
