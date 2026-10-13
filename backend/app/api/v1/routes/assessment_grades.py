from fastapi import APIRouter, Depends, Request
from app.db.session import database
from app.core.security import owned
from app.schemas.inputs import GradePackage
from app.services.assessment_grades import save, readiness
from app.repositories.store import rows
from app.api.v1.common import ok

router=APIRouter(tags=["assessment_grades"])

@router.get("/assessments/{public_id}/grades")
def grades(public_id:str,request:Request,db=Depends(database)):
    value=owned(db,request,public_id)
    return ok({"grades":rows(db,"assessment_grades",assessment_id=value["id"]),**readiness(db,value)})

@router.put("/assessments/{public_id}/grades")
def manual(public_id:str,body:GradePackage,request:Request,db=Depends(database,scope="function")):
    return ok(save(db,owned(db,request,public_id,lock=True),[v.model_dump() for v in body.grades]))
