from fastapi import APIRouter, Depends, Query
from app.db.session import database
from app.core.security import admin
from app.services.audit_logs import listing
from app.api.v1.common import page as envelope

router=APIRouter(tags=["audit_logs"],dependencies=[Depends(admin)])

@router.get("/admin/audit-logs")
def logs(page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),db=Depends(database)):
    records,total=listing(db,page,page_size)
    return envelope(records,page,page_size,total)
