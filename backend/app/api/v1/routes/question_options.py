from fastapi import APIRouter, Depends
from app.db.session import database
from app.core.security import admin
from app.schemas.inputs import Option
from app.services.question_options import listing, replace
from app.services.questions import detail
from app.repositories.store import audit
from app.api.v1.common import ok

router=APIRouter(tags=["question_options"],dependencies=[Depends(admin)])

@router.get("/admin/questions/{identifier}/options")
def options(identifier:int,db=Depends(database)):
    detail(db,identifier)
    return ok(listing(db,identifier,True))

@router.put("/admin/questions/{identifier}/options")
def save(identifier:int,body:list[Option],user=Depends(admin),db=Depends(database)):
    value=replace(db,identifier,[o.model_dump() for o in body])
    audit(db,user,"UPDATE_OPTIONS","questions",identifier)
    return ok(value)
