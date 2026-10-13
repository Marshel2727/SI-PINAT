import hashlib
import hmac
import secrets
import time
from datetime import timedelta
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Request, Depends
from sqlalchemy import select, func, text
from app.core.config import settings
from app.core.errors import fail
from app.db.session import database
from app.repositories.store import one, table, add, now

passwords = PasswordHasher()

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def cookie(response, name, value, path="/", hours=8, http_only=True):
    response.set_cookie(name, value, max_age=hours * 3600, httponly=http_only,
                        secure=settings().cookie_secure, samesite="lax", path=path)

def issue_csrf():
    value = str(int(time.time())) + "." + secrets.token_urlsafe(24)
    signature = hmac.new(settings().app_secret.encode(), value.encode(), hashlib.sha256).hexdigest()
    return value + "." + signature

def csrf(request: Request):
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    token = request.headers.get("x-csrf-token", "")
    stored = request.cookies.get("sipinat_csrf", "")
    if request.headers.get("origin") != settings().public_origin:
        fail(403, "Asal permintaan tidak diizinkan.", "INVALID_ORIGIN")
    if not token or not hmac.compare_digest(token, stored):
        fail(403, "Token keamanan tidak sah. Muat ulang halaman.", "CSRF")
    try:
        timestamp, nonce, signature = token.split(".")
        payload = timestamp + "." + nonce
        expected = hmac.new(settings().app_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        valid = 0 <= time.time() - int(timestamp) <= 7200 and hmac.compare_digest(signature, expected)
    except (ValueError, TypeError):
        valid = False
    if not valid:
        fail(403, "Token keamanan kedaluwarsa. Muat ulang halaman.", "CSRF")

def admin(request: Request, db=Depends(database)):
    session = one(db, "admin_sessions", token_hash=digest(request.cookies.get("sipinat_admin", "")))
    if not session or session["revoked_at"] or session["expires_at"] <= now():
        fail(401, "Silakan masuk sebagai administrator.", "UNAUTHENTICATED")
    user = one(db, "admin_users", id=session["admin_id"])
    if not user or not user["is_active"]:
        fail(401, "Akun tidak aktif.", "UNAUTHENTICATED")
    return user

def owned(db, request, public_id, lock=False):
    t = table("assessments")
    query = select(t).where(t.c.public_id == public_id)
    if lock:
        query = query.with_for_update()
    assessment = db.execute(query).mappings().first()
    token = request.cookies.get("sipinat_a_" + public_id, "")
    if not assessment or not token or not hmac.compare_digest(assessment["access_token_hash"], digest(token)):
        fail(404, "Sesi tidak ditemukan atau bukan milik Anda.", "NOT_FOUND")
    if assessment["expires_at"] and assessment["expires_at"] <= now():
        fail(401, "Sesi asesmen sudah kedaluwarsa. Mulai sesi baru.", "SESSION_EXPIRED")
    return assessment

def limit(db, request, action, maximum, window=60, subject=""):

    # MySQL advisory lock + shared database counter, also safe across workers.
    peer = request.client.host if request.client else "unknown"
    bucket = str(int(time.time()) // window)
    key = action + ":" + digest(peer + bucket + subject)[:40]
    acquired = db.execute(text("SELECT GET_LOCK(:key, 3)"), {"key": key}).scalar()
    if acquired != 1:
        fail(429, "Terlalu banyak permintaan. Coba lagi sebentar.", "RATE_LIMIT")
    try:
        t = table("audit_logs")
        count = db.execute(select(func.count()).select_from(t).where(t.c.action == key, t.c.entity_table == "rate_limit")).scalar()
        if count >= maximum:
            fail(429, "Terlalu banyak percobaan. Coba lagi nanti.", "RATE_LIMIT")
        add(db, "audit_logs", action=key, entity_table="rate_limit")
        db.commit()
    finally:
        db.execute(text("SELECT RELEASE_LOCK(:key)"), {"key": key})
