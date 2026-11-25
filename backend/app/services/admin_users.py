from argon2.exceptions import VerificationError
from sqlalchemy import func, select, update

from app.core.errors import fail
from app.core.security import digest, passwords
from app.repositories.store import audit, change, now, one, table

# Equal-cost dummy hash avoids distinguishing unknown email timing.
DUMMY_HASH = passwords.hash("unused-random-value-for-timing-only")


def authenticate(db, email, password):
    user = one(db, "admin_users", email=email.lower())
    try:
        valid = passwords.verify(user["password_hash"] if user else DUMMY_HASH, password)
    except VerificationError:
        valid = False
    if not user or not user["is_active"] or not valid:
        fail(401, "Email atau kata sandi tidak sesuai.", "INVALID_CREDENTIALS")
    return user


def profile_snapshot(db, request, user):
    sessions = table("admin_sessions")
    current_time = now()
    token = request.cookies.get("sipinat_admin", "") if request else ""
    current_session = one(db, "admin_sessions", token_hash=digest(token)) if token else None

    active_sessions_count = db.execute(
        select(func.count())
        .select_from(sessions)
        .where(
            sessions.c.admin_id == user["id"],
            sessions.c.revoked_at.is_(None),
            sessions.c.expires_at > current_time,
        )
    ).scalar() or 0

    last_login_at = db.execute(
        select(func.max(sessions.c.created_at)).where(sessions.c.admin_id == user["id"])
    ).scalar()

    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "is_active": bool(user["is_active"]),
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
        "session_created_at": current_session["created_at"] if current_session else None,
        "session_expires_at": current_session["expires_at"] if current_session else None,
        "active_sessions_count": int(active_sessions_count),
        "last_login_at": last_login_at,
    }


def update_profile(db, request, user, full_name):
    cleaned = full_name.strip()
    if cleaned != user["full_name"]:
        change(db, "admin_users", user["id"], full_name=cleaned, updated_at=now())
        audit(
            db,
            user,
            "UPDATE",
            "admin_users",
            user["id"],
            before={"full_name": user["full_name"]},
            after={"full_name": cleaned},
        )
    fresh = one(db, "admin_users", id=user["id"])
    return profile_snapshot(db, request, fresh or user)


def change_password(db, request, user, current_password, new_password):
    try:
        valid = passwords.verify(user["password_hash"], current_password)
    except VerificationError:
        valid = False
    if not valid:
        fail(400, "Kata sandi saat ini tidak sesuai.", "INVALID_CURRENT_PASSWORD")

    current_time = now()
    change(
        db,
        "admin_users",
        user["id"],
        password_hash=passwords.hash(new_password),
        updated_at=current_time,
    )

    token = request.cookies.get("sipinat_admin", "") if request else ""
    current_hash = digest(token) if token else ""
    sessions = table("admin_sessions")
    stmt = (
        update(sessions)
        .where(
            sessions.c.admin_id == user["id"],
            sessions.c.revoked_at.is_(None),
            sessions.c.expires_at > current_time,
        )
        .values(revoked_at=current_time)
    )
    if current_hash:
        stmt = stmt.where(sessions.c.token_hash != current_hash)
    revoked_other = int(db.execute(stmt).rowcount or 0)

    audit(
        db,
        user,
        "CHANGE_PASSWORD",
        "admin_users",
        user["id"],
        after={"revoked_other_sessions": revoked_other},
    )
    return {
        "message": "Kata sandi berhasil diperbarui.",
        "revoked_other_sessions": revoked_other,
    }
