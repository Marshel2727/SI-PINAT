import secrets
import uuid
from datetime import timedelta
from sqlalchemy import select
from app.repositories.store import one, rows, table, add, change, now
from app.core.errors import fail
from app.core.security import digest, cookie
from app.core.config import settings
from app.services.specializations import by_code
from app.services.students import identify

def create(db, body, response):
    t = table("fuzzy_model_versions")
    candidates = list(db.execute(select(t).where(t.c.status=="PUBLISHED").order_by(t.c.published_at.desc(),t.c.id.desc())).mappings())
    if body.mode == "FULL":
        candidates = [v for v in candidates if not v["version_code"].upper().startswith(("DEMO","EXAMPLE"))]
    if not candidates:
        fail(503,"Model terpublikasi untuk mode ini belum tersedia. Hubungi pengelola.","MODEL_NOT_READY")
    model = candidates[0]
    token, public_id = secrets.token_urlsafe(32), str(uuid.uuid4())
    student_id = identify(db,body) if body.mode == "FULL" else None
    preference = by_code(db,body.preferred_specialization_code)["id"] if body.preferred_specialization_code else None
    identifier = add(db,"assessments",public_id=public_id,student_id=student_id,preferred_specialization_id=preference,
                     model_version_id=model["id"],access_token_hash=digest(token),mode=body.mode,status="DRAFT",
                     current_semester=body.semester,question_count=30,expires_at=now()+timedelta(hours=settings().session_hours))
    cookie(response,"sipinat_a_"+public_id,token,path="/api/v1/assessments/"+public_id,hours=settings().session_hours)
    return summary(db,one(db,"assessments",id=identifier))

def editable(value):
    if value["status"] in {"IN_PROGRESS","COMPLETED"}:
        fail(409,"Asesmen terkunci. Mulai asesmen baru untuk mengubah input.","ASSESSMENT_LOCKED")

def summary(db, value):
    result = dict(value)
    result["model_version"] = one(db,"fuzzy_model_versions",id=value["model_version_id"])["version_code"]
    result["student"] = one(db,"students",id=value["student_id"]) if value["student_id"] else None
    result["preferred_specialization_code"] = one(db,"specializations",id=value["preferred_specialization_id"])["code"] if value["preferred_specialization_id"] else None
    items = rows(db,"assessment_items",assessment_id=value["id"])
    answers = [one(db,"assessment_answers",assessment_item_id=i["id"]) for i in items]
    result["progress"] = {"total":value["question_count"],"answered":sum(a is not None for a in answers),
                          "user":sum(a is not None and a["answer_source"]=="USER" for a in answers),
                          "example":sum(a is not None and a["answer_source"]=="EXAMPLE" for a in answers)}
    return result

def profile(db, value, body):
    editable(value)
    if value["mode"] == "FULL" and (not body.nim or not body.full_name):
        fail(422,"NIM dan nama wajib.")
    student_id = identify(db,body) if value["mode"]=="FULL" else None
    change(db,"assessments",value["id"],student_id=student_id,current_semester=body.semester,
           preferred_specialization_id=by_code(db,body.preferred_specialization_code)["id"] if body.preferred_specialization_code else None,
           status="DRAFT",updated_at=now())
    from app.services.assessment_grades import readiness
    refreshed = one(db,"assessments",id=value["id"])
    if readiness(db,refreshed)["ready"]:
        change(db,"assessments",value["id"],status="ACADEMIC_READY")
    return summary(db,one(db,"assessments",id=value["id"]))
