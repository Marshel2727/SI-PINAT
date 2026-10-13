from fastapi import APIRouter, Depends
from app.db.session import database
from app.core.security import admin
from app.schemas.inputs import ValidationCase
from app.services.fuzzy_validation_cases import listing, save
from app.api.v1.common import ok

router=APIRouter(tags=["fuzzy_validation_cases"],dependencies=[Depends(admin)])

@router.get("/admin/fuzzy-models/{version_id}/validation-cases")
def cases(version_id:int,db=Depends(database)):
    return ok(listing(db,version_id))

@router.post("/admin/fuzzy-models/{version_id}/validation-cases",status_code=201)
def create(version_id:int,body:ValidationCase,user=Depends(admin),db=Depends(database)):
    return ok(save(db,version_id,body.model_dump(),user))

@router.patch("/admin/fuzzy-models/{version_id}/validation-cases/{identifier}")
def edit(version_id:int,identifier:int,body:ValidationCase,user=Depends(admin),db=Depends(database)):
    return ok(save(db,version_id,body.model_dump(),user,identifier))
