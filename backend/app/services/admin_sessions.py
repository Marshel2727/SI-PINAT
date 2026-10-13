import secrets
from datetime import timedelta
from app.repositories.store import add, change, one, now, audit
from app.core.security import digest, cookie

def create(db, user, response):
    token=secrets.token_urlsafe(32)
    add(db,"admin_sessions",admin_id=user["id"],token_hash=digest(token),expires_at=now()+timedelta(hours=8))
    cookie(response,"sipinat_admin",token)
    audit(db,user,"LOGIN","admin_sessions")
    return {"id":user["id"],"full_name":user["full_name"],"email":user["email"]}

def revoke(db, request, user, response):
    session=one(db,"admin_sessions",token_hash=digest(request.cookies.get("sipinat_admin","")))
    if session:
        change(db,"admin_sessions",session["id"],revoked_at=now())
    response.delete_cookie("sipinat_admin",path="/")
    audit(db,user,"LOGOUT","admin_sessions")
