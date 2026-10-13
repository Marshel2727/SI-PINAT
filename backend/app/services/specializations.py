from app.repositories.store import rows, one
from app.core.errors import fail

def active(db):
    return rows(db,"specializations",is_active=True)

def by_code(db, code):
    value = one(db,"specializations",code=code,is_active=True)
    if not value:
        fail(422,"Peminatan tidak dikenal.")
    return value
