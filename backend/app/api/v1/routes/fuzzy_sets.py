from fastapi import APIRouter, Depends
from app.db.session import database
from app.core.security import admin
from app.schemas.inputs import FuzzySet
from app.services.fuzzy_sets import listing, save
from app.services.fuzzy_model_versions import model
from app.api.v1.common import ok

router=APIRouter(tags=["fuzzy_sets"],dependencies=[Depends(admin)])

@router.get("/admin/fuzzy-models/{version_id}/sets")
def get(version_id:int,db=Depends(database)):
    model(db,version_id)
    return ok(listing(db,version_id))

@router.put("/admin/fuzzy-models/{version_id}/sets")
def put(version_id:int,body:list[FuzzySet],user=Depends(admin),db=Depends(database)):
    return ok(save(db,version_id,[v.model_dump() for v in body],user))
