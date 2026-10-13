from fastapi import APIRouter, Depends, Request
from app.db.session import database
from app.core.security import owned
from app.services.assessment_items import start, items
from app.api.v1.common import ok

router=APIRouter(tags=["assessment_items"])

@router.post("/assessments/{public_id}/test/start")
def begin(public_id:str,request:Request,db=Depends(database,scope="function")):
    return ok(start(db,owned(db,request,public_id,lock=True)))

@router.get("/assessments/{public_id}/test/items")
def listing(public_id:str,request:Request,db=Depends(database)):
    return ok(items(db,owned(db,request,public_id)))
