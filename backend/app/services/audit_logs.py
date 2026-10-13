from sqlalchemy import select, func
from app.repositories.store import table

def listing(db, page, page_size):
    t=table("audit_logs")
    condition=t.c.entity_table!="rate_limit"
    total=db.execute(select(func.count()).select_from(t).where(condition)).scalar()
    data=list(db.execute(select(t).where(condition).order_by(t.c.id.desc()).offset((page-1)*page_size).limit(page_size)).mappings())
    return data,total
