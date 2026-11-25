import secrets
from datetime import timedelta
from sqlalchemy import update
from app.repositories.store import add, change, one, now, audit, table
from app.core.security import digest, cookie


def create(db, user, response):
    token = secrets.token_urlsafe(32)
    add(
        db,
        "admin_sessions",
        admin_id=user["id"],
        token_hash=digest(token),
        expires_at=now() + timedelta(hours=8),
    )
    cookie(response, "sipinat_admin", token)
    audit(db, user, "LOGIN", "admin_sessions")
    return {"id": user["id"], "full_name": user["full_name"], "email": user["email"]}


def revoke(db, request, user, response):
    session = one(db, "admin_sessions", token_hash=digest(request.cookies.get("sipinat_admin", "")))
    if session:
        change(db, "admin_sessions", session["id"], revoked_at=now())
    response.delete_cookie("sipinat_admin", path="/")
    audit(db, user, "LOGOUT", "admin_sessions")


def revoke_others(db, request, user):
    current_token = request.cookies.get("sipinat_admin", "")
    current_hash = digest(current_token) if current_token else ""
    current_time = now()
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
    result = db.execute(stmt)
    count = int(result.rowcount or 0)
    audit(
        db,
        user,
        "REVOKE_OTHER_SESSIONS",
        "admin_sessions",
        user["id"],
        after={"revoked_count": count},
    )
    return {"revoked_count": count}
