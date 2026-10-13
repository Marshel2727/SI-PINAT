from fastapi import APIRouter, Depends
from app.db.session import database
from app.services.specializations import active
from app.api.v1.common import ok

router=APIRouter(tags=["specializations"])

@router.get("/specializations")
def listing(db=Depends(database)):
    return ok(active(db))
