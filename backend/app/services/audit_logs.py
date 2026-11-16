from sqlalchemy import select, func
from app.repositories.store import table


def listing(db, page, page_size, entity_table=None, action=None):
    t = table("audit_logs")
    u = table("admin_users")
    query = select(
        t,
        u.c.full_name.label("admin_name"),
        u.c.email.label("admin_email"),
    ).select_from(t.outerjoin(u, t.c.admin_id == u.c.id)).where(t.c.entity_table != "rate_limit")
    count_query = select(func.count()).select_from(t).where(t.c.entity_table != "rate_limit")
    if entity_table and entity_table.strip():
        et = entity_table.strip()
        query = query.where(t.c.entity_table == et)
        count_query = count_query.where(t.c.entity_table == et)
    if action and action.strip():
        act = action.strip()
        query = query.where(t.c.action == act)
        count_query = count_query.where(t.c.action == act)
    total = db.execute(count_query).scalar()
    data = list(db.execute(query.order_by(t.c.id.desc()).offset((page - 1) * page_size).limit(page_size)).mappings())
    return data, total
