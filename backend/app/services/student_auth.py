import re
import secrets
from datetime import timedelta

from argon2.exceptions import VerificationError
from sqlalchemy import case, func, select, update

from app.core.config import settings
from app.core.errors import fail
from app.core.security import cookie, digest, passwords
from app.repositories.store import add, audit, change, now, one, table
from app.services.assessments import summary as assessment_summary

TEKOM_NIM_RE = re.compile(r"^\d{2}021050\d{4}$")

_DUMMY_HASH = None


def _dummy_hash():
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = passwords.hash("unused-random-value-for-timing-only")
    return _DUMMY_HASH


def safe_student(student):
    if not student:
        return None
    return {
        "id": str(student["id"]),
        "nim": student["nim"],
        "full_name": student["full_name"],
        "class_name": student["class_name"],
        "study_program": student["study_program"],
        "is_active": bool(student["is_active"]),
        "created_at": student["created_at"],
        "updated_at": student["updated_at"],
    }


def _latest_full_assessment_row(db, student_id, include_non_full=False):
    t = table("assessments")
    query = select(t).where(t.c.student_id == student_id)
    if not include_non_full:
        query = query.where(t.c.mode == "FULL")
    else:
        query = query.order_by(
            case((t.c.mode == "FULL", 0), else_=1),
            case((t.c.status == "COMPLETED", 0), else_=1),
            t.c.id.desc(),
        )
    if not include_non_full:
        query = query.order_by(
            case((t.c.status == "COMPLETED", 0), else_=1),
            t.c.id.desc(),
        )
    return db.execute(query.limit(1)).mappings().first()


def latest_full_assessment(db, student_id):
    row = _latest_full_assessment_row(db, student_id, include_non_full=False)
    return assessment_summary(db, row) if row else None


def _issue_session(db, student, response):
    hours = max(settings().session_hours, 24)
    token = secrets.token_urlsafe(32)
    add(
        db,
        "student_sessions",
        student_id=student["id"],
        token_hash=digest(token),
        expires_at=now() + timedelta(hours=hours),
    )
    cookie(response, "sipinat_student", token, path="/", hours=hours)
    return {
        "student": safe_student(student),
        "latest_assessment": latest_full_assessment(db, student["id"]),
    }


def _revoke_active_sessions(db, student_id):
    current_time = now()
    sessions = table("student_sessions")
    result = db.execute(
        update(sessions)
        .where(
            sessions.c.student_id == student_id,
            sessions.c.revoked_at.is_(None),
            sessions.c.expires_at > current_time,
        )
        .values(revoked_at=current_time)
    )
    return int(result.rowcount or 0)


def register(db, body, response):
    nim = body.nim.strip()
    if not TEKOM_NIM_RE.match(nim):
        fail(
            403,
            "Akses ditolak. Hanya mahasiswa Program Studi Teknik Komputer (TEKOM) UNM yang dapat mendaftar.",
            "NON_TEKOM_FORBIDDEN",
        )

    full_name = body.full_name.strip()
    class_name = body.class_name.strip() if body.class_name else None
    password_hash = passwords.hash(body.password)

    existing = one(db, "students", nim=nim)
    if existing:
        if existing["password_hash"]:
            fail(409, "NIM sudah terdaftar. Silakan masuk.", "NIM_ALREADY_REGISTERED")
        if (existing["study_program"] or "").strip().upper() != "TEKOM":
            fail(
                403,
                "Akses ditolak. Hanya mahasiswa Program Studi Teknik Komputer (TEKOM) UNM yang dapat mendaftar.",
                "NON_TEKOM_FORBIDDEN",
            )
        change(
            db,
            "students",
            existing["id"],
            full_name=full_name,
            class_name=class_name,
            study_program="TEKOM",
            password_hash=password_hash,
            is_active=True,
            updated_at=now(),
        )
        student_id = existing["id"]
    else:
        student_id = add(
            db,
            "students",
            nim=nim,
            full_name=full_name,
            class_name=class_name,
            study_program="TEKOM",
            password_hash=password_hash,
            is_active=True,
        )

    student = one(db, "students", id=student_id)
    return _issue_session(db, student, response)


def login(db, body, response):
    nim = body.nim.strip()
    student = one(db, "students", nim=nim)
    stored_hash = student["password_hash"] if (student and student["password_hash"]) else _dummy_hash()
    try:
        valid = passwords.verify(stored_hash, body.password)
    except VerificationError:
        valid = False
    if not student or not student["password_hash"] or not valid:
        fail(401, "NIM atau kata sandi salah.", "INVALID_CREDENTIALS")
    if not student["is_active"]:
        fail(403, "Akun mahasiswa dinonaktifkan. Hubungi admin.", "STUDENT_INACTIVE")
    if (student["study_program"] or "").strip().upper() != "TEKOM":
        fail(
            403,
            "Akses ditolak. Hanya mahasiswa Teknik Komputer (TEKOM) yang dapat masuk.",
            "NON_TEKOM_FORBIDDEN",
        )
    return _issue_session(db, student, response)


def logout(db, request, response):
    token = request.cookies.get("sipinat_student", "") if request else ""
    if token:
        session = one(db, "student_sessions", token_hash=digest(token))
        if session and not session["revoked_at"]:
            change(db, "student_sessions", session["id"], revoked_at=now())
    response.delete_cookie("sipinat_student", path="/")
    return {"logged_out": True}


def me(db, student):
    return {
        "student": safe_student(student),
        "latest_assessment": latest_full_assessment(db, student["id"]),
    }


def _admin_student_item(db, row):
    latest = _latest_full_assessment_row(db, row["id"], include_non_full=True)
    return {
        **safe_student(row),
        "has_password": bool(row["password_hash"]),
        "assessment_public_id": latest["public_id"] if latest else None,
        "assessment_status": latest["status"] if latest else None,
    }


def admin_list_students(db, search="", study_program=None, page=1, page_size=20):
    st = table("students")
    query = select(st)
    term = (search or "").strip()
    if term:
        query = query.where(
            st.c.nim.icontains(term, autoescape=True)
            | st.c.full_name.icontains(term, autoescape=True)
        )
    prodi = (study_program or "").strip().upper()
    if prodi and prodi != "ALL":
        if prodi in {"NON-TEKOM", "NON_TEKOM"}:
            query = query.where(func.upper(st.c.study_program) != "TEKOM")
        else:
            query = query.where(func.upper(st.c.study_program) == prodi)

    total = int(db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0)
    rows_page = list(
        db.execute(
            query.order_by(st.c.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).mappings()
    )
    return [_admin_student_item(db, row) for row in rows_page], total


def admin_create_student(db, body, user):
    nim = body.nim.strip()
    if one(db, "students", nim=nim):
        fail(409, "NIM sudah terdaftar.", "NIM_EXISTS")
    study_program = body.study_program.strip().upper()
    class_name = body.class_name.strip() if body.class_name else None
    student_id = add(
        db,
        "students",
        nim=nim,
        full_name=body.full_name.strip(),
        class_name=class_name,
        study_program=study_program,
        password_hash=passwords.hash(body.password),
        is_active=body.is_active,
    )
    created = one(db, "students", id=student_id)
    audit(db, user, "CREATE", "students", student_id, after=created)
    return _admin_student_item(db, created)


def admin_update_student(db, student_id, body, user):
    before = one(db, "students", id=student_id)
    if not before:
        fail(404, "Mahasiswa tidak ditemukan.", "NOT_FOUND")

    updates = {}
    if "full_name" in body.model_fields_set and body.full_name is not None:
        updates["full_name"] = body.full_name.strip()
    if "class_name" in body.model_fields_set:
        updates["class_name"] = body.class_name.strip() if body.class_name else None
    if "study_program" in body.model_fields_set and body.study_program is not None:
        updates["study_program"] = body.study_program.strip().upper()
    if "is_active" in body.model_fields_set and body.is_active is not None:
        updates["is_active"] = body.is_active

    if updates:
        updates["updated_at"] = now()
        change(db, "students", student_id, **updates)

    after = one(db, "students", id=student_id)
    if not after["is_active"] or (after["study_program"] or "").strip().upper() != "TEKOM":
        _revoke_active_sessions(db, student_id)

    audit(db, user, "UPDATE", "students", student_id, before=before, after=after)
    return _admin_student_item(db, after)


def admin_reset_password(db, student_id, body, user):
    student = one(db, "students", id=student_id)
    if not student:
        fail(404, "Mahasiswa tidak ditemukan.", "NOT_FOUND")
    change(
        db,
        "students",
        student_id,
        password_hash=passwords.hash(body.new_password),
        updated_at=now(),
    )
    revoked = _revoke_active_sessions(db, student_id)
    audit(
        db,
        user,
        "UPDATE",
        "students",
        student_id,
        after={"password_reset": True, "revoked_sessions": revoked},
    )
    return {"id": str(student_id), "password_reset": True, "revoked_sessions": revoked}
