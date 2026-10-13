from sqlalchemy import select
from app.repositories.store import rows, one, add, change, table, audit, now
from app.core.errors import fail

def listing(db, search="", semester=None, sort="code"):
    t = table("courses")
    query = select(t)
    if search:
        query = query.where(t.c.code.contains(search,autoescape=True) | t.c.name.contains(search,autoescape=True))
    if semester:
        query = query.where(t.c.semester==semester)
    key = {"code":t.c.code,"name":t.c.name,"semester":t.c.semester}.get(sort)
    if key is None:
        fail(422,"Urutan tidak dikenal.")
    return list(db.execute(query.order_by(key)).mappings())

def save(db, body, user, identifier=None):
    before = one(db,"courses",id=identifier) if identifier else None
    if identifier and not before:
        fail(404,"Mata kuliah tidak ditemukan.")
    if identifier:
        referenced = rows(db,"course_weights",course_id=identifier)
        locked = any(one(db,"fuzzy_model_versions",id=w["model_version_id"])["status"]=="PUBLISHED" for w in referenced)
        if locked and any(body[k]!=before[k] for k in ["code","name","semester","credits"]):
            fail(409,"Metadata dirujuk model terpublikasi. Nonaktifkan dan buat master baru agar versi lama tetap utuh.")
        change(db,"courses",identifier,**body,updated_at=now())
    else:
        identifier=add(db,"courses",**body)
    audit(db,user,"UPDATE" if before else "CREATE","courses",identifier,before,body)
    return one(db,"courses",id=identifier)

def for_assessment(db, value):
    weights = rows(db,"course_weights",model_version_id=value["model_version_id"])
    ids = {w["course_id"] for w in weights}
    # Include referenced masters even if later deactivated.
    courses = [c for c in rows(db,"courses") if c["id"] in ids and c["semester"]<=min(value["current_semester"],4)]
    return {"courses":sorted(courses,key=lambda c:(c["semester"],c["code"])),
            "weights":weights,"conversions":rows(db,"grade_conversions",model_version_id=value["model_version_id"])}
