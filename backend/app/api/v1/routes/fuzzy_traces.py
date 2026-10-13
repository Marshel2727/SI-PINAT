from fastapi import APIRouter, Depends, Request
from app.db.session import database
from app.core.security import owned, admin
from app.services.fuzzy_traces import trace
from app.repositories.store import one
from app.core.errors import fail
from app.api.v1.common import ok

router=APIRouter(tags=["fuzzy_traces"])

@router.get("/assessments/{public_id}/result/trace")
def participant(public_id:str,request:Request,specialization_code:str="ES-01",db=Depends(database)):
    return ok(trace(db,owned(db,request,public_id),specialization_code))

@router.get("/admin/assessments/{public_id}/trace")
def administrator(public_id:str,specialization_code:str="ES-01",user=Depends(admin),db=Depends(database)):
    assessment=one(db,"assessments",public_id=public_id)
    if not assessment:
        fail(404,"Asesmen tidak ditemukan.")
    return ok(trace(db,assessment,specialization_code))
