from fastapi import APIRouter, Depends, Request
from app.db.session import database
from app.core.security import owned
from app.schemas.inputs import Answer
from app.services.assessment_answers import save, examples
from app.api.v1.common import ok

router=APIRouter(tags=["assessment_answers"])

@router.put("/assessments/{public_id}/test/items/{item_id}/answer")
def answer(public_id:str,item_id:int,body:Answer,request:Request,db=Depends(database,scope="function")):
    return ok(save(db,owned(db,request,public_id,lock=True),item_id,body.option_id))

@router.post("/assessments/{public_id}/demo/fill-examples")
def fill(public_id:str,request:Request,db=Depends(database,scope="function")):
    return ok(examples(db,owned(db,request,public_id,lock=True)))
