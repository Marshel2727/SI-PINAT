from fastapi import APIRouter, Depends, Request, Response
from app.db.session import database
from app.core.security import owned, limit
from app.schemas.inputs import AssessmentCreate
from app.services.assessments import create, summary
from app.api.v1.common import ok

router=APIRouter(tags=["assessments"])

@router.post("/assessments",status_code=201)
def new(body:AssessmentCreate,request:Request,response:Response,db=Depends(database)):
    limit(db,request,"assessment",20,300)
    return ok(create(db,body,response))

@router.get("/assessments/{public_id}")
def current(public_id:str,request:Request,db=Depends(database)):
    return ok(summary(db,owned(db,request,public_id)))
