from fastapi import APIRouter, Depends, Request
from app.db.session import database
from app.core.security import owned
from app.services.recommendation_runs import complete
from app.api.v1.common import ok

router=APIRouter(tags=["recommendation_runs"])

@router.post("/assessments/{public_id}/complete")
def finish(public_id:str,request:Request,db=Depends(database)):
    return ok(complete(db,owned(db,request,public_id,lock=True)))
