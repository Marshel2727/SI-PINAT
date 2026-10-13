from fastapi import APIRouter
from sqlalchemy import inspect, text
from app.db.session import engine
from app.models import TABLES
from app.core.errors import fail
from app.api.v1.common import ok

router=APIRouter(tags=["health"])

@router.get("/health/live")
def live():
    return ok({"status":"alive"})

@router.get("/health/ready")
def ready():
    try:
        with engine.connect() as db:
            tables=set(inspect(db).get_table_names())
            revision=db.execute(text("SELECT version_num FROM alembic_version")).scalar()
            specs=set(db.execute(text("SELECT code FROM specializations WHERE is_active=TRUE")).scalars())
            valid=set(TABLES).issubset(tables) and revision=="0001_initial" and specs=={"ES-01","SC-02","JDF-03"}
    except Exception:
        valid=False
    if not valid:
        fail(503,"Database, migrasi, atau master belum siap.","NOT_READY")
    return ok({"status":"ready","tables":23,"migration":"0001_initial"})
