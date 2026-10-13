from app.repositories.store import rows, one, add, change, audit
from app.services.question_options import replace, listing
from app.core.errors import fail
from sqlalchemy import select, func
from app.repositories.store import table

def listing(db, status=None, specialization_id=None, search=""):
    t = table("questions")
    query = select(t)
    if status:
        query = query.where(t.c.status == status)
    if specialization_id:
        query = query.where(t.c.specialization_id == specialization_id)
    if search:
        query = query.where(t.c.code.contains(search, autoescape=True) | t.c.prompt.contains(search, autoescape=True))
    return list(db.execute(query.order_by(t.c.code, t.c.revision.desc())).mappings())

def published_summary(db):
    t = table("questions")
    counts = dict(db.execute(select(t.c.specialization_id, func.count(func.distinct(t.c.code)))
                             .where(t.c.status == "PUBLISHED").group_by(t.c.specialization_id)).all())
    return [{"specialization_id": spec["id"], "code": spec["code"], "name": spec["name"],
             "published_count": counts.get(spec["id"], 0), "required_count": 10,
             "ready": counts.get(spec["id"], 0) >= 10}
            for spec in rows(db, "specializations", is_active=True)]

def detail(db, identifier):
    question=one(db,"questions",id=identifier)
    if not question:
        fail(404,"Soal tidak ditemukan.")
    return {**question,"options":listing(db,identifier,True)}

def save(db, body, user, identifier=None):
    body=dict(body)
    options=body.pop("options")
    if identifier:
        db.execute(select(table("questions")).where(table("questions").c.id==identifier).with_for_update()).first()
    before=detail(db,identifier) if identifier else None
    if not one(db,"specializations",id=body["specialization_id"],is_active=True):
        fail(422,"Peminatan tidak dikenal.")
    if identifier:
        if before["status"]!="DRAFT":
            fail(409,"Soal terkunci. Buat revisi baru.")
        if body["code"]!=before["code"]:
            fail(422,"Kode soal tetap; buat soal baru untuk kode lain.")
        change(db,"questions",identifier,**body)
    else:
        versions=rows(db,"questions",code=body["code"])
        identifier=add(db,"questions",**body,revision=max([q["revision"] for q in versions],default=0)+1,status="DRAFT")
    replace(db,identifier,options)
    audit(db,user,"SAVE","questions",identifier,before,body)
    return detail(db,identifier)

def revision(db, identifier, user):
    old=detail(db,identifier)
    body={k:old[k] for k in ["code","prompt","explanation","specialization_id"]}
    body["options"]=[{k:o[k] for k in ["label","option_text","is_correct"]} for o in old["options"]]
    return save(db,body,user)

def set_status(db, identifier, status, user):
    db.execute(select(table("questions")).where(table("questions").c.id==identifier).with_for_update()).first()
    question=detail(db,identifier)
    if status=="PUBLISHED":
        if question["status"]!="DRAFT" or sum(o["is_correct"] for o in question["options"])!=1 or len(question["options"])<2:
            fail(409,"Hanya draft dengan tepat satu kunci dapat dipublikasikan.")
        # Archive previous published revision; existing assessment_items keep their original ID.
        for old in rows(db,"questions",code=question["code"],status="PUBLISHED"):
            change(db,"questions",old["id"],status="ARCHIVED")
    change(db,"questions",identifier,status=status)
    audit(db,user,status,"questions",identifier)
    return detail(db,identifier)
