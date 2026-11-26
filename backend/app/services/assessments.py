import secrets
import uuid
from datetime import timedelta
from sqlalchemy import select, case
from app.repositories.store import one, rows, table, add, change, now
from app.core.errors import fail
from app.core.security import digest, cookie, current_student
from app.core.config import settings
from app.services.specializations import by_code
from app.services.students import identify


def create(db, body, response, request=None):
    if body.mode == "FULL":
        if request is None:
            fail(401, "Silakan masuk menggunakan akun mahasiswa TEKOM.", "UNAUTHENTICATED")
        student = current_student(request, db, required=True)
        if body.semester < 4:
            fail(422, "Input nilai dan penentuan peminatan wajib minimal Semester 4.")
        assessments_table = table("assessments")
        existing = db.execute(
            select(assessments_table)
            .where(assessments_table.c.student_id == student["id"], assessments_table.c.mode == "FULL")
            .order_by(case((assessments_table.c.status == "COMPLETED", 1), else_=0).desc(), assessments_table.c.id.desc())
        ).mappings().first()
        if existing:
            token = secrets.token_urlsafe(32)
            change(
                db,
                "assessments",
                existing["id"],
                access_token_hash=digest(token),
                expires_at=now() + timedelta(hours=settings().session_hours),
            )
            if response is not None:
                cookie(
                    response,
                    "sipinat_a_" + existing["public_id"],
                    token,
                    path="/api/v1/assessments/" + existing["public_id"],
                    hours=settings().session_hours,
                )
            return summary(db, one(db, "assessments", id=existing["id"]))
        student_id = student["id"]
    else:
        student_id = None

    t = table("fuzzy_model_versions")
    candidates = list(db.execute(select(t).where(t.c.status == "PUBLISHED").order_by(t.c.published_at.desc(), t.c.id.desc())).mappings())
    if body.mode == "FULL":
        candidates = [v for v in candidates if not v["version_code"].upper().startswith(("DEMO", "EXAMPLE"))]
    if not candidates:
        fail(
            503,
            "Model terpublikasi untuk mode ini belum tersedia. Hubungi pengelola.",
            "MODEL_NOT_READY",
        )
    model = candidates[0]
    token, public_id = secrets.token_urlsafe(32), str(uuid.uuid4())
    preference = by_code(db, body.preferred_specialization_code)["id"] if body.preferred_specialization_code else None
    identifier = add(
        db,
        "assessments",
        public_id=public_id,
        student_id=student_id,
        preferred_specialization_id=preference,
        model_version_id=model["id"],
        access_token_hash=digest(token),
        mode=body.mode,
        status="DRAFT",
        current_semester=body.semester,
        question_count=30,
        expires_at=now() + timedelta(hours=settings().session_hours),
    )
    if response is not None:
        cookie(
            response,
            "sipinat_a_" + public_id,
            token,
            path="/api/v1/assessments/" + public_id,
            hours=settings().session_hours,
        )
    return summary(db, one(db, "assessments", id=identifier))


def editable(value, allow_completed=False):
    locked = {"IN_PROGRESS"} if allow_completed else {"IN_PROGRESS", "COMPLETED"}
    if value["status"] in locked:
        fail(409, "Asesmen terkunci. Mulai asesmen baru untuk mengubah input.", "ASSESSMENT_LOCKED")


def summary(db, value):
    result = dict(value)
    result["model_version"] = one(
        db,
        "fuzzy_model_versions",
        id=value["model_version_id"],
    )["version_code"]
    result["student"] = one(db, "students", id=value["student_id"]) if value["student_id"] else None
    result["preferred_specialization_code"] = one(
        db,
        "specializations",
        id=value["preferred_specialization_id"],
    )["code"] if value["preferred_specialization_id"] else None
    items = rows(db, "assessment_items", assessment_id=value["id"])
    answers = [one(db, "assessment_answers", assessment_item_id=i["id"]) for i in items]
    result["progress"] = {
        "total": value["question_count"],
        "answered": sum(a is not None for a in answers),
        "user": sum(a is not None and a["answer_source"] == "USER" for a in answers),
        "example": sum(a is not None and a["answer_source"] == "EXAMPLE" for a in answers),
    }
    return result


def profile(db, value, body):
    editable(value)
    if value["mode"] == "FULL":
        if body.semester < 4:
            fail(422, "Input nilai dan penentuan peminatan wajib minimal Semester 4.")
        if value["student_id"]:
            student_id = value["student_id"]
        elif body.nim and body.full_name:
            student_id = identify(db, body)
        else:
            fail(422, "NIM dan nama wajib.")
    else:
        student_id = None
    change(
        db,
        "assessments",
        value["id"],
        student_id=student_id,
        current_semester=body.semester,
        preferred_specialization_id=by_code(db, body.preferred_specialization_code)["id"] if body.preferred_specialization_code else None,
        status="DRAFT",
        updated_at=now(),
    )
    from app.services.assessment_grades import readiness
    refreshed = one(db, "assessments", id=value["id"])
    if readiness(db, refreshed)["ready"]:
        change(db, "assessments", value["id"], status="ACADEMIC_READY")
    return summary(db, one(db, "assessments", id=value["id"]))
