from fastapi import HTTPException
from sqlalchemy import select, func
from app.repositories.store import rows, one, add, change, remove_where, audit, table
from app.services.question_options import replace, listing as list_options
from app.core.errors import fail


def listing(db, status=None, specialization_id=None, search=""):
    t = table("questions")
    latest_rows = db.execute(select(t.c.code, func.max(t.c.revision).label("max_rev")).group_by(t.c.code)).all()
    latest_by_code = {code: max_rev for code, max_rev in latest_rows}
    query = select(t)
    if status:
        query = query.where(t.c.status == status)
    if specialization_id:
        query = query.where(t.c.specialization_id == specialization_id)
    if search:
        query = query.where(t.c.code.contains(search, autoescape=True) | t.c.prompt.contains(search, autoescape=True))
    items = list(db.execute(query.order_by(t.c.code, t.c.revision.desc())).mappings())
    return [{
        **row,
        "is_latest_revision": row["revision"] == latest_by_code.get(row["code"], row["revision"]),
    } for row in items]


def published_summary(db):
    t = table("questions")
    counts = dict(db.execute(select(
        t.c.specialization_id,
        func.count(func.distinct(t.c.code)),
    ) .where(t.c.status == "PUBLISHED").group_by(t.c.specialization_id)).all())
    return [{
        "specialization_id": spec["id"],
        "code": spec["code"],
        "name": spec["name"],
        "published_count": counts.get(spec["id"], 0),
        "required_count": 10,
        "ready": counts.get(spec["id"], 0) >= 10,
    } for spec in rows(db, "specializations", is_active=True)]


def detail(db, identifier):
    question = one(db, "questions", id=identifier)
    if not question:
        fail(404, "Soal tidak ditemukan.")
    return {**question, "options": list_options(db, identifier, True)}


def save(db, body, user, identifier=None):
    body = dict(body)
    options = body.pop("options")
    if identifier:
        db.execute(select(table("questions")).where(table("questions").c.id == identifier).with_for_update()).first()
    before = detail(db, identifier) if identifier else None
    if not one(db, "specializations", id=body["specialization_id"], is_active=True):
        fail(422, "Peminatan tidak dikenal.")
    if identifier:
        if before["status"] != "DRAFT":
            fail(409, "Soal terkunci. Buat revisi baru.")
        if body["code"] != before["code"]:
            fail(422, "Kode soal tetap; buat soal baru untuk kode lain.")
        change(db, "questions", identifier, **body)
    else:
        versions = rows(db, "questions", code=body["code"])
        identifier = add(
            db,
            "questions",
            **body,
            revision=max([q["revision"] for q in versions], default=0) + 1,
            status="DRAFT",
        )
    replace(db, identifier, options)
    audit(db, user, "SAVE", "questions", identifier, before, body)
    return detail(db, identifier)


def revision(db, identifier, user):
    old = detail(db, identifier)
    body = {k: old[k] for k in ["code", "prompt", "explanation", "specialization_id"]}
    body["options"] = [{k: o[k] for k in ["label", "option_text", "is_correct"]} for o in old["options"]]
    return save(db, body, user)


def set_status(db, identifier, status, user):
    db.execute(select(table("questions")).where(table("questions").c.id == identifier).with_for_update()).first()
    question = detail(db, identifier)
    if status == "PUBLISHED":
        if question["status"] not in ("DRAFT", "ARCHIVED") or sum(o["is_correct"] for o in question["options"]) != 1 or len(question["options"]) < 2:
            fail(409, "Hanya draft atau arsip dengan tepat satu kunci dapat dipublikasikan.")
            # Restoring an archived revision is only allowed for the newest revision of that code,
            # so an older revision cannot silently replace a newer one.
        if question["status"] == "ARCHIVED" and any(q["revision"] > question["revision"] for q in rows(db, "questions", code=question["code"])):
            fail(409, "Hanya revisi terbaru yang dapat ditampilkan kembali.")
            # Archive previous published revision; existing assessment_items keep their original ID.
        for old in rows(db, "questions", code=question["code"], status="PUBLISHED"):
            change(db, "questions", old["id"], status="ARCHIVED")
    change(db, "questions", identifier, status=status)
    audit(db, user, status, "questions", identifier)
    return detail(db, identifier)


def remove(db, identifier, user):
    t = table("questions")
    db.execute(select(t).where(t.c.id == identifier).with_for_update()).first()
    before = detail(db, identifier)
    if before["status"] != "DRAFT":
        fail(409, "Hanya soal berstatus DRAFT yang dapat dihapus.")
    remove_where(db, "question_options", question_id=identifier)
    remove_where(db, "questions", id=identifier)
    audit(db, user, "DELETE", "questions", identifier, before=before)
    return {"deleted": True, "id": identifier}


def bulk_import(db, items, publish, user):
    created = []
    published_count = 0
    errors = []
    for index, item in enumerate(items):
        try:
            saved = save(db, item, user)
            if publish:
                saved = set_status(db, saved["id"], "PUBLISHED", user)
                published_count += 1
            created.append(saved)
        except HTTPException as exc:
            detail_msg = exc.detail.get("message") if isinstance(exc.detail, dict) else str(exc.detail)
            errors.append({"index": index, "code": item.get("code"), "message": detail_msg})
    return {"created": created, "published_count": published_count, "errors": errors}
