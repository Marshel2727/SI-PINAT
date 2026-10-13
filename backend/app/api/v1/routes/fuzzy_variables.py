from fastapi import APIRouter, Depends
from app.db.session import database
from app.core.security import admin
from app.schemas.inputs import Variable
from app.services.fuzzy_variables import listing, save
from app.services.fuzzy_model_versions import model
from app.api.v1.common import ok

router=APIRouter(tags=["fuzzy_variables"],dependencies=[Depends(admin)])

@router.get("/admin/fuzzy-models/{version_id}/variables")
def get(version_id:int,db=Depends(database)):
    model(db,version_id)
    return ok(listing(db,version_id))

@router.put("/admin/fuzzy-models/{version_id}/variables")
def put(version_id:int,body:list[Variable],user=Depends(admin),db=Depends(database,scope="function")):
    return ok(save(db,version_id,[v.model_dump() for v in body],user))
