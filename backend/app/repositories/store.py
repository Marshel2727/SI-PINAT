from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, insert, update, delete, func
from app.models import TABLES

def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def table(name):
    return TABLES[name]

def one(db, name, **filters):
    t = table(name)
    return db.execute(select(t).filter_by(**filters)).mappings().first()

def rows(db, name, **filters):
    return list(db.execute(select(table(name)).filter_by(**filters)).mappings())

def add(db, name, **values):
    result = db.execute(insert(table(name)).values(**values))
    return result.inserted_primary_key[0]

def change(db, name, identifier, **values):
    t = table(name)
    key = list(t.primary_key.columns)[0]
    db.execute(update(t).where(key == identifier).values(**values))

def remove_where(db, name, **filters):
    t = table(name)
    db.execute(delete(t).filter_by(**filters))

def safe(value):
    if isinstance(value, dict) or hasattr(value, "items"):
        return {k: str(v) if v is not None and (k == "id" or k.endswith("_id")) else safe(v)
                for k, v in value.items() if k not in {"password_hash", "token_hash", "access_token_hash", "storage_key", "file_hash"}}
    if isinstance(value, (list, tuple)):
        return [safe(v) for v in value]
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds") + "Z"
    if isinstance(value, Decimal):
        return float(value)
    return value

def audit(db, admin, action, name, identifier=None, before=None, after=None):
    add(db, "audit_logs", admin_id=admin["id"] if admin else None, action=action,
        entity_table=name, entity_id=identifier, before_data=safe(before), after_data=safe(after))
