from sqlalchemy import select
from app.repositories.store import rows, one, add, change, table, audit, now
from app.services.grade_conversions import sort_conversions
from app.core.errors import fail


def _locked_course_ids(db, course_id=None):
    cw = table("course_weights")
    fmv = table("fuzzy_model_versions")
    query = (
        select(cw.c.course_id)
        .select_from(cw.join(fmv, cw.c.model_version_id == fmv.c.id))
        .where(fmv.c.status == "PUBLISHED")
        .distinct()
    )
    if course_id is not None:
        query = query.where(cw.c.course_id == course_id)
    return set(db.execute(query).scalars())


def listing(db, search="", semester=None, sort="code", is_active=None):
    t = table("courses")
    query = select(t)
    if search:
        query = query.where(t.c.code.contains(search, autoescape=True) | t.c.name.contains(search, autoescape=True))
    if semester:
        query = query.where(t.c.semester == semester)
    if is_active is not None:
        query = query.where(t.c.is_active == is_active)
    key = {"code": t.c.code, "name": t.c.name, "semester": t.c.semester}.get(sort)
    if key is None:
        fail(422, "Urutan tidak dikenal.")
    items = list(db.execute(query.order_by(key)).mappings())
    locked = _locked_course_ids(db)
    return [{**item, "is_locked_by_published": item["id"] in locked} for item in items]


def save(db, body, user, identifier=None):
    before = one(db, "courses", id=identifier) if identifier else None
    if identifier and not before:
        fail(404, "Mata kuliah tidak ditemukan.")
    if identifier:
        locked = bool(_locked_course_ids(db, identifier))
        if locked and any(body[k] != before[k] for k in ["code", "name", "semester", "credits"]):
            fail(
                409,
                "Metadata dirujuk model terpublikasi. Nonaktifkan dan buat master baru agar versi lama tetap utuh.",
            )
        change(db, "courses", identifier, **body, updated_at=now())
    else:
        identifier = add(db, "courses", **body)
    audit(db, user, "UPDATE" if before else "CREATE", "courses", identifier, before, body)
    saved = one(db, "courses", id=identifier)
    return {**saved, "is_locked_by_published": bool(_locked_course_ids(db, identifier))}


def for_assessment(db, value):
    weights = rows(db, "course_weights", model_version_id=value["model_version_id"])
    ids = {w["course_id"] for w in weights}
    # Include referenced masters even if later deactivated.
    courses = [c for c in rows(db, "courses") if c["id"] in ids and c["semester"] <= min(value["current_semester"], 4)]
    return {
        "courses": sorted(courses, key=lambda c: (c["semester"], c["code"])),
        "weights": weights,
        "conversions": sort_conversions(rows(db, "grade_conversions", model_version_id=value["model_version_id"])),
    }
