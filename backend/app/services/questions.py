from app.repositories.store import rows, one, add, change, audit
from app.services.question_options import replace, listing
from app.core.errors import fail
from sqlalchemy import select
from app.repositories.store import table

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
